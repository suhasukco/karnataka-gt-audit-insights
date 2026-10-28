"""Infrastructure & digital-commerce readiness — fact_infrastructure and
fact_business together, since they're both 1:1 flag tables against outlet
and every page that wants one wants the other alongside it.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import fetch_all, fetch_one, get_db
from app.core.filters import Segment, SegmentParam, geo_source, outlet_scope

router = APIRouter(prefix="/api/infrastructure", tags=["infrastructure"])

INFRA_FLAGS = [
    "fridge_flag", "cooler_flag", "deep_freezer_flag", "display_rack_flag", "chips_stand_flag",
    "hanger_flag", "cash_counter_display_flag", "poster_dangler_flag", "promoter_flag",
    "sampling_area_flag", "ac_flag", "name_board_flag", "cadbury_display_flag",
]
DIGITAL_FLAGS = [
    "billing_software_flag", "digital_payment_flag", "card_accepted_flag", "gift_coupon_sodexo_flag",
    "door_delivery_flag", "online_sales_flag", "company_tieup_flag", "b2b_purchase_flag",
]
ALL_FLAGS = INFRA_FLAGS + DIGITAL_FLAGS


def _pct_expr(flag: str, alias: str | None = None) -> str:
    return f"round(100.0 * sum(case when {flag} then 1 else 0 end) / count(*), 1) AS {alias or flag}"


@router.get("/summary")
def summary(segment: Segment = SegmentParam(), db: Session = Depends(get_db)) -> dict:
    infra_select = ", ".join(_pct_expr(f) for f in INFRA_FLAGS)
    digital_select = ", ".join(_pct_expr(f) for f in DIGITAL_FLAGS)

    # These two read the fact tables directly with no geography join, so the
    # segment is applied as an outlet_id restriction rather than by swapping
    # the source. `WHERE true` gives outlet_scope() something to AND onto.
    infra_row = fetch_one(
        db,
        f"SELECT {infra_select} FROM warehouse.fact_infrastructure"
        f" WHERE true{outlet_scope(segment, 'outlet_id')}",
    )
    digital_row = fetch_one(
        db,
        f"SELECT {digital_select} FROM warehouse.fact_business"
        f" WHERE true{outlet_scope(segment, 'outlet_id')}",
    )
    return {"infrastructure": infra_row, "digital": digital_row}


@router.get("/by-district")
def by_district(segment: Segment = SegmentParam(), db: Session = Depends(get_db)) -> list[dict]:
    """Per-district penetration on the 5 highest-signal flags, plus a simple
    composite score (mean of all flags, 0-100) for the choropleth.
    """
    pct_aliases = [f"{f}_pct" for f in ALL_FLAGS]
    flag_selects = ", ".join(_pct_expr(f, alias) for f, alias in zip(ALL_FLAGS, pct_aliases))
    sql = f"""
        WITH per_district AS (
            SELECT g.district, {flag_selects}
            FROM {geo_source(segment)} g
            JOIN warehouse.fact_infrastructure fi ON fi.outlet_id = g.outlet_id
            JOIN warehouse.fact_business fb ON fb.outlet_id = g.outlet_id
            GROUP BY g.district
        )
        SELECT *,
            round(({" + ".join(pct_aliases)}) / {len(pct_aliases)}.0, 1) AS composite_score
        FROM per_district
        ORDER BY composite_score DESC
    """
    return fetch_all(db, sql)


@router.get("/by-outlet-type")
def by_outlet_type(segment: Segment = SegmentParam(), db: Session = Depends(get_db)) -> list[dict]:
    key_flags = ["fridge_flag", "cooler_flag", "deep_freezer_flag", "billing_software_flag", "digital_payment_flag", "ac_flag"]
    flag_selects = ", ".join(_pct_expr(f) for f in key_flags)
    sql = f"""
        SELECT g.outlet_type, count(*) AS outlet_count, {flag_selects}
        FROM {geo_source(segment)} g
        JOIN warehouse.fact_infrastructure fi ON fi.outlet_id = g.outlet_id
        JOIN warehouse.fact_business fb ON fb.outlet_id = g.outlet_id
        WHERE g.outlet_type IS NOT NULL
        GROUP BY g.outlet_type
        ORDER BY outlet_count DESC
    """
    return fetch_all(db, sql)


@router.get("/sales-correlation")
def sales_correlation(segment: Segment = SegmentParam(), db: Session = Depends(get_db)) -> list[dict]:
    """For each flag, average monthly sales for outlets that HAVE it vs. DON'T
    — a plain, honest way to show what actually correlates with higher sales
    without pretending a full regression from a single API call.
    """
    rows = []
    for flag, table in [(f, "fact_infrastructure") for f in INFRA_FLAGS] + [(f, "fact_business") for f in DIGITAL_FLAGS]:
        sql = f"""
            SELECT
                round(avg(fb.sales_monthly_avg) FILTER (WHERE t.{flag} = true), 0) AS avg_sales_with,
                round(avg(fb.sales_monthly_avg) FILTER (WHERE t.{flag} = false), 0) AS avg_sales_without,
                count(*) FILTER (WHERE t.{flag} = true) AS outlets_with
            FROM warehouse.{table} t
            JOIN warehouse.fact_business fb ON fb.outlet_id = t.outlet_id
            WHERE fb.sales_monthly_avg IS NOT NULL{outlet_scope(segment, "t.outlet_id")}
        """
        row = fetch_one(db, sql)
        if row:
            rows.append({"flag": flag, **row})
    return rows
