"""Category intelligence — real availability %, SKU depth, and basket
(co-occurrence) analysis across the 22 tracked categories.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import fetch_all, get_db
from app.core.filters import Segment, SegmentParam, geo_source, outlet_scope

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("/availability")
def availability(segment: Segment = SegmentParam(), db: Session = Depends(get_db)) -> list[dict]:
    sql = f"""
        SELECT
            c.category_name,
            c.display_order,
            round(100.0 * sum(case when f.available then 1 else 0 end) / count(*), 1) AS availability_pct,
            round(avg(f.sku_count) FILTER (WHERE f.available), 1) AS avg_sku_count
        FROM warehouse.fact_outlet_category f
        JOIN warehouse.dim_product_category c ON c.category_id = f.category_id
        WHERE true{outlet_scope(segment, "f.outlet_id")}
        GROUP BY c.category_name, c.display_order
        ORDER BY availability_pct DESC
    """
    return fetch_all(db, sql)


@router.get("/whitespace")
def whitespace(
    limit: int = Query(6, le=22),
    segment: Segment = SegmentParam(),
    db: Session = Depends(get_db),
) -> list[dict]:
    sql = f"""
        SELECT
            c.category_name,
            round(100.0 * sum(case when f.available then 1 else 0 end) / count(*), 1) AS availability_pct,
            round(100.0 - 100.0 * sum(case when f.available then 1 else 0 end) / count(*), 1) AS white_space_pct
        FROM warehouse.fact_outlet_category f
        JOIN warehouse.dim_product_category c ON c.category_id = f.category_id
        WHERE true{outlet_scope(segment, "f.outlet_id")}
        GROUP BY c.category_name
        ORDER BY white_space_pct DESC
        LIMIT :limit
    """
    return fetch_all(db, sql, {"limit": limit})


@router.get("/by-district")
def by_district(
    limit_districts: int = Query(8, le=31),
    segment: Segment = SegmentParam(),
    db: Session = Depends(get_db),
) -> dict:
    """Heatmap-ready: top N districts (by outlet count) × all 22 categories."""
    # The district ranking uses the filtered source too, so "top 8 districts"
    # means top 8 *within the selected segment* rather than statewide.
    sql = f"""
        WITH top_districts AS (
            SELECT district FROM {geo_source(segment)} AS t GROUP BY district ORDER BY count(*) DESC LIMIT :limit_districts
        )
        SELECT g.district, c.category_name,
               round(100.0 * sum(case when f.available then 1 else 0 end) / count(*), 1) AS availability_pct
        FROM warehouse.fact_outlet_category f
        JOIN warehouse.dim_product_category c ON c.category_id = f.category_id
        JOIN {geo_source(segment)} g ON g.outlet_id = f.outlet_id
        WHERE g.district IN (SELECT district FROM top_districts)
        GROUP BY g.district, c.category_name, c.display_order
        ORDER BY c.display_order
    """
    rows = fetch_all(db, sql, {"limit_districts": limit_districts})
    districts = sorted({r["district"] for r in rows})
    ordered_categories = list(dict.fromkeys(r["category_name"] for r in rows))  # already ordered by display_order
    lookup = {(r["district"], r["category_name"]): r["availability_pct"] for r in rows}
    matrix = [[lookup.get((d, c), 0) for d in districts] for c in ordered_categories]
    return {"districts": districts, "categories": ordered_categories, "matrix": matrix}


@router.get("/co-occurrence")
def co_occurrence(
    limit: int = Query(20, le=100),
    segment: Segment = SegmentParam(),
    db: Session = Depends(get_db),
) -> list[dict]:
    """Which category pairs show up together in the same outlet most often —
    cross-sell / basket-adjacency signal, not possible with the old mock data.
    """
    sql = f"""
        SELECT c1.category_name AS category_a, c2.category_name AS category_b, count(*) AS outlet_count
        FROM warehouse.fact_outlet_category f1
        JOIN warehouse.fact_outlet_category f2
            ON f1.outlet_id = f2.outlet_id AND f1.category_id < f2.category_id
        JOIN warehouse.dim_product_category c1 ON c1.category_id = f1.category_id
        JOIN warehouse.dim_product_category c2 ON c2.category_id = f2.category_id
        WHERE f1.available = true AND f2.available = true{outlet_scope(segment, "f1.outlet_id")}
        GROUP BY c1.category_name, c2.category_name
        ORDER BY outlet_count DESC
        LIMIT :limit
    """
    return fetch_all(db, sql, {"limit": limit})
