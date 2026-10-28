"""Brand intelligence.

The real `Brands Stocked` column isn't a generic "what's on the shelf" list —
it's a distribution-penetration audit for a small set of specifically named
brands (Ullas Agarabatti, Indira Foods, Nirantara Oil, Naturo, Gusto, Hangyo
Ice Cream), with "None of the Above" recorded for outlets stocking none of
them. ~74% of outlets fall into that bucket. Every endpoint here excludes
"None of the Above" from the brand ranking itself and reports it separately
as the no-penetration rate.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import fetch_all, fetch_one, get_db
from app.core.filters import Segment, SegmentParam, geo_source, outlet_scope

router = APIRouter(prefix="/api/brands", tags=["brands"])

NONE_FILTER = "lower(b.brand_name) != 'none of the above'"


@router.get("/penetration")
def penetration(segment: Segment = SegmentParam(), db: Session = Depends(get_db)) -> dict:
    # Denominator has to move with the segment too, or penetration would be
    # computed against the statewide outlet count and read far too low.
    total_outlets = fetch_one(
        db, f"SELECT count(*) AS n FROM {geo_source(segment)} AS g"
    )["n"]

    brand_rows = fetch_all(db, f"""
        SELECT b.brand_name, count(DISTINCT ob.outlet_id) AS outlet_count,
               round(100.0 * count(DISTINCT ob.outlet_id) / :total, 1) AS penetration_pct
        FROM warehouse.fact_outlet_brand ob
        JOIN warehouse.dim_brand b ON b.brand_id = ob.brand_id
        WHERE {NONE_FILTER}{outlet_scope(segment, "ob.outlet_id")}
        GROUP BY b.brand_name
        ORDER BY outlet_count DESC
    """, {"total": total_outlets})

    none_row = fetch_one(db, f"""
        SELECT count(DISTINCT ob.outlet_id) AS outlet_count
        FROM warehouse.fact_outlet_brand ob
        JOIN warehouse.dim_brand b ON b.brand_id = ob.brand_id
        WHERE lower(b.brand_name) = 'none of the above'{outlet_scope(segment, "ob.outlet_id")}
    """)
    no_brand_count = none_row["outlet_count"] if none_row else 0

    return {
        "totalOutlets": total_outlets,
        "brands": brand_rows,
        "noTrackedBrandCount": no_brand_count,
        "noTrackedBrandPct": round(100.0 * no_brand_count / total_outlets, 1),
    }


@router.get("/by-district")
def by_district(
    limit_districts: int = Query(10, le=31),
    segment: Segment = SegmentParam(),
    db: Session = Depends(get_db),
) -> dict:
    sql = f"""
        WITH top_districts AS (
            SELECT district FROM {geo_source(segment)} AS t GROUP BY district ORDER BY count(*) DESC LIMIT :limit_districts
        ),
        district_totals AS (
            SELECT district, count(*) AS total FROM {geo_source(segment)} AS dtot GROUP BY district
        )
        SELECT g.district, b.brand_name,
               round(100.0 * count(DISTINCT ob.outlet_id) / dt.total, 1) AS penetration_pct
        FROM warehouse.fact_outlet_brand ob
        JOIN warehouse.dim_brand b ON b.brand_id = ob.brand_id
        JOIN {geo_source(segment)} g ON g.outlet_id = ob.outlet_id
        JOIN district_totals dt ON dt.district = g.district
        WHERE {NONE_FILTER} AND g.district IN (SELECT district FROM top_districts)
        GROUP BY g.district, b.brand_name, dt.total
        ORDER BY g.district, penetration_pct DESC
    """
    rows = fetch_all(db, sql, {"limit_districts": limit_districts})
    districts = sorted({r["district"] for r in rows})
    brands = sorted({r["brand_name"] for r in rows})
    lookup = {(r["district"], r["brand_name"]): r["penetration_pct"] for r in rows}
    matrix = [[lookup.get((d, b), 0) for d in districts] for b in brands]
    return {"districts": districts, "brands": brands, "matrix": matrix}


@router.get("/co-occurrence")
def co_occurrence(segment: Segment = SegmentParam(), db: Session = Depends(get_db)) -> list[dict]:
    sql = f"""
        SELECT b1.brand_name AS brand_a, b2.brand_name AS brand_b, count(*) AS outlet_count
        FROM warehouse.fact_outlet_brand ob1
        JOIN warehouse.fact_outlet_brand ob2
            ON ob1.outlet_id = ob2.outlet_id AND ob1.brand_id < ob2.brand_id
        JOIN warehouse.dim_brand b1 ON b1.brand_id = ob1.brand_id
        JOIN warehouse.dim_brand b2 ON b2.brand_id = ob2.brand_id
        WHERE lower(b1.brand_name) != 'none of the above' AND lower(b2.brand_name) != 'none of the above'{outlet_scope(segment, "ob1.outlet_id")}
        GROUP BY b1.brand_name, b2.brand_name
        ORDER BY outlet_count DESC
    """
    return fetch_all(db, sql)


@router.get("/whitespace")
def whitespace(segment: Segment = SegmentParam(), db: Session = Depends(get_db)) -> list[dict]:
    """Districts with the highest share of outlets carrying NONE of the
    tracked brands — the clearest "go sell here" list this dataset can produce.
    """
    sql = f"""
        WITH district_totals AS (
            SELECT district, count(*) AS total FROM {geo_source(segment)} AS dtot GROUP BY district
        ),
        none_counts AS (
            SELECT g.district, count(DISTINCT ob.outlet_id) AS none_count
            FROM warehouse.fact_outlet_brand ob
            JOIN warehouse.dim_brand b ON b.brand_id = ob.brand_id
            JOIN {geo_source(segment)} g ON g.outlet_id = ob.outlet_id
            WHERE lower(b.brand_name) = 'none of the above'
            GROUP BY g.district
        )
        SELECT dt.district, dt.total AS outlet_count, coalesce(nc.none_count, 0) AS no_tracked_brand_count,
               round(100.0 * coalesce(nc.none_count, 0) / dt.total, 1) AS no_tracked_brand_pct
        FROM district_totals dt
        LEFT JOIN none_counts nc ON nc.district = dt.district
        ORDER BY no_tracked_brand_pct DESC
    """
    return fetch_all(db, sql)
