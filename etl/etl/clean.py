"""Clean: type-coerce and validate the raw (all-text) DataFrame into a typed
staging frame. Still one row per outlet (wide) — the split into dimensions and
facts happens in transform.py.
"""

import logging
import re

import pandas as pd
from sqlalchemy import text
from sqlalchemy.engine import Engine

from etl.category_map import CATEGORY_COLUMN_MAP
from etl.config import KARNATAKA_LAT_RANGE, KARNATAKA_LNG_RANGE

logger = logging.getLogger(__name__)

STAGING_SCHEMA = "staging"
STAGING_TABLE = "outlets_clean"

TRUE_VALUES = {"y", "yes", "true", "1", "available", "present"}
FALSE_VALUES = {"n", "no", "false", "0", "not available", "absent", ""}

NON_CATEGORY_FLAG_COLUMNS = [
    "Fridge Flag", "Cooler Flag", "Deep Freezer Flag", "Display Rack Flag",
    "Chips Stand Flag", "Hanger Flag", "Cash Counter Display", "Poster Dangler Flag",
    "Promoter Flag", "Sampling Area Flag", "AC Flag", "Cadbury Display Flag",
    "Billing Software Flag", "Digital Payment Accepted", "Card Accepted",
    "Gift Coupon Sodexo Flag", "Door Delivery Flag", "Online Sales Flag",
    "Company Tieup Flag", "B2B Purchase Flag",
]

CATEGORY_FLAG_COLUMNS = [c.flag_col for c in CATEGORY_COLUMN_MAP if c.flag_col]
ALL_FLAG_COLUMNS = NON_CATEGORY_FLAG_COLUMNS + CATEGORY_FLAG_COLUMNS

COUNT_COLUMNS = [
    "Outlet Age", "Shutters Count", "Fridge Count", "Cooler Count", "Deep Freezer Count",
    "Display Rack Count", "Cash Counter Count", "Employee Count",
]

# These are pipe-delimited sub-type lists (e.g. "Basmati|Branded|Regular"), NOT
# numeric SKU counts, despite the column name — see category_map.py. Cleaned
# as plain text; transform.py derives sku_count by counting pipe-delimited items.
SUBTYPE_COLUMNS = [c.subtype_col for c in CATEGORY_COLUMN_MAP if c.subtype_col]

FLOAT_COLUMNS = ["Latitude", "Longitude", "Sales Monthly Avg"]


def to_bool(series: pd.Series) -> pd.Series:
    def parse(v):
        if pd.isna(v):
            return pd.NA
        key = str(v).strip().lower()
        if key in TRUE_VALUES:
            return True
        if key in FALSE_VALUES:
            return False
        return pd.NA

    return series.map(parse).astype("boolean")


def to_nullable_int(series: pd.Series) -> pd.Series:
    cleaned = series.astype(str).str.extract(r"(-?\d+)", expand=False)
    return pd.to_numeric(cleaned, errors="coerce").astype("Int64")


def to_nullable_float(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce")


def clean_text(series: pd.Series) -> pd.Series:
    cleaned = series.astype(str).str.strip().str.replace(r"\s+", " ", regex=True)
    return cleaned.replace({"": pd.NA, "nan": pd.NA, "None": pd.NA})


def clean_phone(series: pd.Series) -> pd.Series:
    def parse(v):
        if pd.isna(v):
            return pd.NA
        digits = re.sub(r"\D", "", str(v))
        if len(digits) == 12 and digits.startswith("91"):
            digits = digits[2:]
        if len(digits) == 11 and digits.startswith("0"):
            digits = digits[1:]
        return digits if digits else pd.NA

    return series.map(parse)


def clean_gst(series: pd.Series) -> pd.Series:
    cleaned = series.astype(str).str.strip().str.upper()
    # Some rows were entered as "GSTIN:29ABCDE1234F1Z5" instead of the bare number.
    cleaned = cleaned.str.replace(r"^GSTIN\s*[:\-]?\s*", "", regex=True)
    return cleaned.replace({"": pd.NA, "NAN": pd.NA})


def clean_name_board(series: pd.Series) -> pd.Series:
    """"Name Board" isn't a Yes/No flag in the source — its real values are
    "Own" / "Company" / "No Board" (who owns the signage). Both "Own" and
    "Company" mean a board is present; only "No Board" means it isn't.
    """
    def parse(v):
        if pd.isna(v):
            return pd.NA
        key = str(v).strip().lower()
        if key == "no board":
            return False
        if key in ("own", "company"):
            return True
        return pd.NA

    return series.map(parse).astype("boolean")


def validate_latlong(df: pd.DataFrame) -> pd.DataFrame:
    lat_min, lat_max = KARNATAKA_LAT_RANGE
    lng_min, lng_max = KARNATAKA_LNG_RANGE
    in_bounds = df["Latitude"].between(lat_min, lat_max) & df["Longitude"].between(lng_min, lng_max)

    invalid_count = int((~in_bounds & df["Latitude"].notna()).sum())
    if invalid_count:
        logger.warning("%d outlet(s) have lat/long outside Karnataka's bounding box — nulling them out", invalid_count)

    df.loc[~in_bounds, ["Latitude", "Longitude"]] = pd.NA
    return df


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    for col in ALL_FLAG_COLUMNS:
        df[col] = to_bool(df[col])
    df["Name Board"] = clean_name_board(df["Name Board"])

    for col in COUNT_COLUMNS:
        df[col] = to_nullable_int(df[col])

    for col in FLOAT_COLUMNS:
        df[col] = to_nullable_float(df[col])

    df = validate_latlong(df)

    df["Contact No"] = clean_phone(df["Contact No"])
    df["Alternate Contact No"] = clean_phone(df["Alternate Contact No"])
    df["Key Person Phone No"] = clean_phone(df["Key Person Phone No"])
    df["GST No"] = clean_gst(df["GST No"])

    text_columns = [
        c for c in df.columns
        if c not in ALL_FLAG_COLUMNS + COUNT_COLUMNS + FLOAT_COLUMNS
        and c not in ("Contact No", "Alternate Contact No", "Key Person Phone No", "GST No", "Name Board", "source_row_id")
    ]
    # (SUBTYPE_COLUMNS are included here on purpose — they get the same plain
    # text cleaning as everything else; transform.py reads their pipe structure.)
    for col in text_columns:
        df[col] = clean_text(df[col])

    return df


def write_staging(engine: Engine, df: pd.DataFrame) -> None:
    with engine.begin() as conn:
        conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {STAGING_SCHEMA}"))

    df.to_sql(STAGING_TABLE, engine, schema=STAGING_SCHEMA, if_exists="replace", index=False, chunksize=5000)
    logger.info("Loaded %d rows into %s.%s", len(df), STAGING_SCHEMA, STAGING_TABLE)
