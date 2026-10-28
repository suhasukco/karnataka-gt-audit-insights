"""Transform: reshape the cleaned wide DataFrame into the dimension and fact
shapes the warehouse expects. Everything here is keyed by `source_row_id`
(not `outlet_id` yet — that surrogate key doesn't exist until load.py inserts
into warehouse.outlet).
"""

import re

import pandas as pd

from etl.category_map import CATEGORY_COLUMN_MAP
from etl.config import DEFAULT_STATE

BRAND_SPLIT_PATTERN = re.compile(r"[,;/|]|\band\b|&", flags=re.IGNORECASE)

# District/Taluk are NOT NULL on dim_geography (every real query groups by
# them), but ~0.1% of real rows have one or both blank — field data entry
# gaps, not something we should guess-fill from City. Coalescing to an
# explicit sentinel keeps those outlets visible in reports (an "Unknown
# District" bucket you can go audit) instead of either crashing the load or
# silently vanishing from every district-level aggregate.
UNKNOWN_DISTRICT = "Unknown District"
UNKNOWN_TALUK = "Unknown Taluk"


def normalize_geo_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Returns (state, district, taluk, city, pincode) with the same
    fill-in-blanks rule applied everywhere it's needed — both `build_geography`
    (to build the dimension rows) and `load.py` (to build the merge key that
    looks up each outlet's geography_id) MUST use this same function, or a
    blank-taluk outlet will fail to match its own dimension row.
    """
    geo = df[["City", "Taluka", "District", "Pin Code"]].copy()
    geo.columns = ["city", "taluk", "district", "pincode"]
    geo["state"] = df["State"].fillna(DEFAULT_STATE)
    geo["district"] = geo["district"].fillna(UNKNOWN_DISTRICT)
    geo["taluk"] = geo["taluk"].fillna(UNKNOWN_TALUK)
    return geo[["state", "district", "taluk", "city", "pincode"]]


def build_geography(df: pd.DataFrame) -> pd.DataFrame:
    geo = normalize_geo_columns(df)
    return geo.drop_duplicates(subset=["state", "district", "taluk", "city", "pincode"]).reset_index(drop=True)


def build_lookup(df: pd.DataFrame, source_col: str, name_col: str) -> pd.DataFrame:
    values = df[source_col].dropna().drop_duplicates().reset_index(drop=True)
    return pd.DataFrame({name_col: values})


def normalize_brand_name(raw: str) -> str:
    cleaned = re.sub(r"\s+", " ", raw).strip()
    if cleaned.isupper() and len(cleaned) <= 5:
        return cleaned  # likely an acronym (ITC, HUL, P&G) — title-casing would mangle it
    return cleaned.title()


def build_brand_rows(df: pd.DataFrame) -> pd.DataFrame:
    """Splits the free-text `Brands Stocked` column into one row per
    (source_row_id, brand_name). Casing/whitespace duplicates are collapsed via
    `normalized_name`; anything fuzzier (typos, abbreviations) is a follow-up
    once we've seen how messy the real column actually is.
    """
    rows: list[dict] = []
    for source_row_id, raw in zip(df["source_row_id"], df["Brands Stocked"]):
        if pd.isna(raw) or not str(raw).strip():
            continue
        for piece in BRAND_SPLIT_PATTERN.split(str(raw)):
            name = normalize_brand_name(piece)
            if len(name) < 2:
                continue
            rows.append({"source_row_id": source_row_id, "brand_name": name, "normalized_name": name.lower()})

    brand_rows = pd.DataFrame(rows, columns=["source_row_id", "brand_name", "normalized_name"])
    return brand_rows.drop_duplicates(subset=["source_row_id", "normalized_name"]).reset_index(drop=True)


def count_pipe_items(series: pd.Series) -> pd.Series:
    """Counts pipe-delimited sub-type selections, e.g. "Basmati|Branded|Regular
    Rice" -> 3. This is the real "SKU depth" signal in this dataset — the
    source's "*_SKU" columns hold sub-type text, not a literal SKU number.
    """
    def count(v):
        if pd.isna(v) or not str(v).strip():
            return pd.NA
        return len([p for p in str(v).split("|") if p.strip()])

    return series.map(count).astype("Int64")


def build_category_facts(df: pd.DataFrame) -> pd.DataFrame:
    """Unpivots the 22 non-uniform category column groups into a long
    (source_row_id, category_name, available, sku_count, product_type_text)
    frame — one row per category the outlet actually reported on.

    `subtype_col` (see category_map.py) is a pipe-delimited list of sub-types
    for every category except Egg — `product_type_text` keeps the raw list,
    `sku_count` is derived as the number of items in it.
    """
    frames = []
    for cat in CATEGORY_COLUMN_MAP:
        subtype_text = df[cat.subtype_col] if cat.subtype_col else pd.Series(pd.NA, index=df.index)
        sku_count = count_pipe_items(subtype_text)

        if cat.flag_col:
            flag_raw = df[cat.flag_col]  # nullable boolean: True / False / <NA>
            flag_has_signal = flag_raw.notna()
            available = flag_raw.fillna(False)
        else:
            # OTC Products: no flag column in source. A blank sub-type list here
            # is a genuine "not stocked", not "not asked" — every outlet gets a
            # row (unlike the flag-driven categories, where has_signal below
            # correctly excludes rows the flag was never set for).
            flag_has_signal = pd.Series(True, index=df.index)
            available = sku_count.fillna(0) > 0

        frame = pd.DataFrame({
            "source_row_id": df["source_row_id"],
            "category_name": cat.category_name,
            "available": available.astype(bool),
            "sku_count": sku_count,
            "product_type_text": subtype_text,
        })
        # Only keep rows where the outlet actually reported *something* for this
        # category (an explicit flag or a sub-type selection) — distinguishing
        # "confirmed not stocked" from "field was left blank".
        has_signal = flag_has_signal | subtype_text.notna()
        frames.append(frame[has_signal])

    return pd.concat(frames, ignore_index=True)
