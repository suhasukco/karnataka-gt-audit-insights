"""Load: truncate-and-reload the warehouse + restricted schemas from the
cleaned staging frame.

This is a **full refresh** on every run, not an incremental upsert — appropriate
because this is a one-time census, not a recurring survey (confirmed with the
data owner). If this ever needs to become incremental, the dimension inserts
below are the place to add `ON CONFLICT DO NOTHING` + re-select instead of
truncate-first.
"""

import logging

import pandas as pd
from sqlalchemy import text
from sqlalchemy.engine import Engine

from etl.transform import build_brand_rows, build_category_facts, build_geography, build_lookup, normalize_geo_columns

logger = logging.getLogger(__name__)

# Order matters: children before parents.
TRUNCATE_ORDER = [
    "restricted.outlet_contact",
    "warehouse.fact_outlet_brand",
    "warehouse.fact_outlet_category",
    "warehouse.fact_business",
    "warehouse.fact_infrastructure",
    "warehouse.outlet",
    "warehouse.dim_brand",
    "warehouse.dim_geography",
    "warehouse.dim_outlet_type",
    "warehouse.dim_channel",
    "warehouse.dim_outlet_class",
    "warehouse.dim_ownership",
]

OUTLET_TYPE_MAP = ("Outlet Type", "warehouse", "dim_outlet_type", "type_name", "outlet_type_id")
CHANNEL_MAP = ("Channel", "warehouse", "dim_channel", "channel_name", "channel_id")
OUTLET_CLASS_MAP = ("Outlet Class", "warehouse", "dim_outlet_class", "class_name", "outlet_class_id")
OWNERSHIP_MAP = ("Outlet Ownership Type", "warehouse", "dim_ownership", "ownership_name", "ownership_id")

INFRA_COLUMN_RENAME = {
    "Shutters Count": "shutters_count", "Name Board": "name_board_flag",
    "Fridge Flag": "fridge_flag", "Fridge Count": "fridge_count",
    "Cooler Flag": "cooler_flag", "Cooler Count": "cooler_count",
    "Deep Freezer Flag": "deep_freezer_flag", "Deep Freezer Count": "deep_freezer_count",
    "Display Rack Flag": "display_rack_flag", "Display Rack Count": "display_rack_count",
    "Chips Stand Flag": "chips_stand_flag", "Hanger Flag": "hanger_flag",
    "Cash Counter Display": "cash_counter_display_flag", "Cash Counter Count": "cash_counter_count",
    "Poster Dangler Flag": "poster_dangler_flag", "Promoter Flag": "promoter_flag",
    "Sampling Area Flag": "sampling_area_flag", "AC Flag": "ac_flag",
    "Cadbury Display Flag": "cadbury_display_flag",
}
BUSINESS_COLUMN_RENAME = {
    "Sales Monthly Avg": "sales_monthly_avg", "Billing Software Flag": "billing_software_flag",
    "Digital Payment Accepted": "digital_payment_flag", "Card Accepted": "card_accepted_flag",
    "Gift Coupon Sodexo Flag": "gift_coupon_sodexo_flag", "Door Delivery Flag": "door_delivery_flag",
    "Online Sales Flag": "online_sales_flag", "Company Tieup Flag": "company_tieup_flag",
    "B2B Purchase Flag": "b2b_purchase_flag",
}
CONTACT_COLUMN_RENAME = {
    "Owner Name": "owner_name", "Contact Person": "contact_person", "Contact No": "contact_no",
    "Alternate Contact No": "alternate_contact_no", "Key Person": "key_person",
    "Key Person Phone No": "key_person_phone_no", "Email Address": "email_address", "GST No": "gst_no",
}


def truncate_all(engine: Engine) -> None:
    with engine.begin() as conn:
        for table in TRUNCATE_ORDER:
            conn.execute(text(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE"))
    logger.info("Truncated %d warehouse/restricted tables for full refresh", len(TRUNCATE_ORDER))


def load_lookup_and_map(engine: Engine, df: pd.DataFrame, source_col: str, schema: str, table: str, name_col: str, id_col: str) -> dict[str, int]:
    lookup = build_lookup(df, source_col, name_col)
    lookup.to_sql(table, engine, schema=schema, if_exists="append", index=False)
    with engine.begin() as conn:
        rows = conn.execute(text(f"SELECT {id_col}, {name_col} FROM {schema}.{table}")).all()
    return {name: id_ for id_, name in rows}


def load_geography(engine: Engine, df: pd.DataFrame) -> pd.DataFrame:
    geo = build_geography(df)
    geo.to_sql("dim_geography", engine, schema="warehouse", if_exists="append", index=False)
    with engine.begin() as conn:
        existing = conn.execute(text(
            "SELECT geography_id, state, district, taluk, city, pincode FROM warehouse.dim_geography"
        )).all()
    geo_ids = pd.DataFrame(existing, columns=["geography_id", "state", "district", "taluk", "city", "pincode"])
    logger.info("Loaded %d distinct geography combinations", len(geo_ids))
    return geo_ids


def load_outlets(engine: Engine, df: pd.DataFrame, geo_ids: pd.DataFrame, type_map: dict, channel_map: dict, class_map: dict, ownership_map: dict) -> pd.DataFrame:
    outlet = df[[
        "source_row_id", "Outlet Name", "Outlet Age", "State", "District", "Taluka", "City", "Pin Code",
        "Street Address", "Landmark", "In and Around", "GPS Location", "Latitude", "Longitude",
        "Employee Count", "Sale Option", "Purchase Option", "Outlet Related Remarks",
    ]].copy()
    # Must use the exact same blank-fill rule as build_geography(), or an outlet
    # with a blank District/Taluka won't match the "Unknown District" row that
    # was inserted for it.
    outlet = outlet.join(normalize_geo_columns(df))

    outlet = outlet.merge(
        geo_ids,
        on=["state", "district", "taluk", "city", "pincode"],
        how="left",
    )

    outlet["outlet_type_id"] = df["Outlet Type"].map(type_map)
    outlet["channel_id"] = df["Channel"].map(channel_map)
    outlet["outlet_class_id"] = df["Outlet Class"].map(class_map)
    outlet["ownership_id"] = df["Outlet Ownership Type"].map(ownership_map)

    outlet_insert = outlet.rename(columns={
        "Outlet Name": "outlet_name", "Outlet Age": "outlet_age",
        "Street Address": "street_address", "Landmark": "landmark", "In and Around": "in_and_around",
        "GPS Location": "gps_location_raw", "Latitude": "latitude", "Longitude": "longitude",
        "Employee Count": "employee_count", "Sale Option": "sale_option", "Purchase Option": "purchase_option",
        "Outlet Related Remarks": "outlet_related_remarks",
    })[[
        "source_row_id", "outlet_name", "outlet_type_id", "channel_id", "outlet_class_id", "ownership_id",
        "outlet_age", "geography_id", "street_address", "landmark", "in_and_around", "gps_location_raw",
        "latitude", "longitude", "employee_count", "sale_option", "purchase_option", "outlet_related_remarks",
    ]]

    missing_geo = outlet_insert["geography_id"].isna().sum()
    if missing_geo:
        logger.warning("%d outlet(s) failed to match a geography row and will be dropped", missing_geo)
    outlet_insert = outlet_insert.dropna(subset=["geography_id"])

    outlet_insert.to_sql("outlet", engine, schema="warehouse", if_exists="append", index=False)

    with engine.begin() as conn:
        has_geom = conn.execute(text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_schema='warehouse' AND table_name='outlet' AND column_name='geom'"
        )).scalar()
        if has_geom:
            conn.execute(text(
                "UPDATE warehouse.outlet SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) "
                "WHERE latitude IS NOT NULL AND longitude IS NOT NULL"
            ))
        rows = conn.execute(text("SELECT outlet_id, source_row_id FROM warehouse.outlet")).all()

    logger.info("Loaded %d outlets", len(rows))
    return pd.DataFrame(rows, columns=["outlet_id", "source_row_id"])


def load_infrastructure(engine: Engine, df: pd.DataFrame, outlet_ids: pd.DataFrame) -> None:
    infra = df[["source_row_id"] + list(INFRA_COLUMN_RENAME.keys())].rename(columns=INFRA_COLUMN_RENAME)
    infra = infra.merge(outlet_ids, on="source_row_id").drop(columns=["source_row_id"])
    infra.to_sql("fact_infrastructure", engine, schema="warehouse", if_exists="append", index=False)
    logger.info("Loaded %d fact_infrastructure rows", len(infra))


def load_business(engine: Engine, df: pd.DataFrame, outlet_ids: pd.DataFrame) -> None:
    biz = df[["source_row_id"] + list(BUSINESS_COLUMN_RENAME.keys())].rename(columns=BUSINESS_COLUMN_RENAME)
    biz = biz.merge(outlet_ids, on="source_row_id").drop(columns=["source_row_id"])
    biz.to_sql("fact_business", engine, schema="warehouse", if_exists="append", index=False)
    logger.info("Loaded %d fact_business rows", len(biz))


def load_categories(engine: Engine, df: pd.DataFrame, outlet_ids: pd.DataFrame) -> None:
    facts = build_category_facts(df)
    with engine.begin() as conn:
        category_rows = conn.execute(text("SELECT category_id, category_name FROM warehouse.dim_product_category")).all()
    category_map = {name: cid for cid, name in category_rows}

    facts["category_id"] = facts["category_name"].map(category_map)
    unmapped = facts["category_id"].isna().sum()
    if unmapped:
        logger.warning("%d category fact row(s) reference an unknown category name", unmapped)

    facts = facts.merge(outlet_ids, on="source_row_id").drop(columns=["source_row_id", "category_name"]).dropna(subset=["category_id"])
    facts.to_sql("fact_outlet_category", engine, schema="warehouse", if_exists="append", index=False)
    logger.info("Loaded %d fact_outlet_category rows", len(facts))


def load_brands(engine: Engine, df: pd.DataFrame, outlet_ids: pd.DataFrame) -> None:
    brand_rows = build_brand_rows(df)
    if brand_rows.empty:
        logger.info("No brand data found in source — skipping dim_brand / fact_outlet_brand")
        return

    distinct_brands = brand_rows[["brand_name", "normalized_name"]].drop_duplicates(subset=["normalized_name"])
    distinct_brands.to_sql("dim_brand", engine, schema="warehouse", if_exists="append", index=False)

    with engine.begin() as conn:
        rows = conn.execute(text("SELECT brand_id, brand_name FROM warehouse.dim_brand")).all()
    brand_map = {name: bid for bid, name in rows}

    brand_rows["brand_id"] = brand_rows["brand_name"].map(brand_map)
    outlet_brands = brand_rows.merge(outlet_ids, on="source_row_id")[["outlet_id", "brand_id"]].dropna().drop_duplicates()
    outlet_brands.to_sql("fact_outlet_brand", engine, schema="warehouse", if_exists="append", index=False)
    logger.info("Loaded %d distinct brands, %d outlet-brand links", len(distinct_brands), len(outlet_brands))


def load_contacts(engine: Engine, df: pd.DataFrame, outlet_ids: pd.DataFrame) -> None:
    contacts = df[["source_row_id"] + list(CONTACT_COLUMN_RENAME.keys())].rename(columns=CONTACT_COLUMN_RENAME)
    contacts = contacts.merge(outlet_ids, on="source_row_id").drop(columns=["source_row_id"])
    contacts.to_sql("outlet_contact", engine, schema="restricted", if_exists="append", index=False)
    logger.info("Loaded %d restricted.outlet_contact rows", len(contacts))


def run_full_load(engine: Engine, df: pd.DataFrame) -> None:
    truncate_all(engine)

    geo_ids = load_geography(engine, df)
    type_map = load_lookup_and_map(engine, df, *OUTLET_TYPE_MAP)
    channel_map = load_lookup_and_map(engine, df, *CHANNEL_MAP)
    class_map = load_lookup_and_map(engine, df, *OUTLET_CLASS_MAP)
    ownership_map = load_lookup_and_map(engine, df, *OWNERSHIP_MAP)

    outlet_ids = load_outlets(engine, df, geo_ids, type_map, channel_map, class_map, ownership_map)

    load_infrastructure(engine, df, outlet_ids)
    load_business(engine, df, outlet_ids)
    load_categories(engine, df, outlet_ids)
    load_brands(engine, df, outlet_ids)
    load_contacts(engine, df, outlet_ids)
