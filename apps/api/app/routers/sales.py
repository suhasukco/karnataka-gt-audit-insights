"""Sales & revenue intelligence — real Sales Monthly Avg, not the modeled
revenue-opportunity proxy the old mock dashboard used.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import fetch_all, fetch_one, get_db
from app.core.filters import Segment, SegmentParam, geo_source, outlet_scope

router = APIRouter(prefix="/api/sales", tags=["sales"])


@router.get("/summary")
def summary(segment: Segment = SegmentParam(), db: Session = Depends(get_db)) -> dict:
    # Reads fact_business alone, so the segment is applied as an outlet_id
    # restriction rather than by swapping the geography source.
    sql = f"""
        SELECT
            count(*) AS outlets_reporting,
            round(avg(sales_monthly_avg), 0) AS mean,
            round(percentile_cont(0.5) WITHIN GROUP (ORDER BY sales_monthly_avg)::numeric, 0) AS median,
            round(percentile_cont(0.25) WITHIN GROUP (ORDER BY sales_monthly_avg)::numeric, 0) AS p25,
            round(percentile_cont(0.75) WITHIN GROUP (ORDER BY sales_monthly_avg)::numeric, 0) AS p75,
            round(sum(sales_monthly_avg), 0) AS total_monthly_sales
        FROM warehouse.fact_business
        WHERE sales_monthly_avg IS NOT NULL AND sales_monthly_avg > 0
        {outlet_scope(segment, "outlet_id")}
    """
    return fetch_one(db, sql)


@router.get("/by-district")
def by_district(segment: Segment = SegmentParam(), db: Session = Depends(get_db)) -> list[dict]:
    sql = f"""
        SELECT g.district,
               round(avg(fb.sales_monthly_avg), 0) AS avg_monthly_sales,
               round(sum(fb.sales_monthly_avg), 0) AS total_monthly_sales,
               count(*) AS outlets_reporting
        FROM warehouse.fact_business fb
        JOIN {geo_source(segment)} g ON g.outlet_id = fb.outlet_id
        WHERE fb.sales_monthly_avg IS NOT NULL AND fb.sales_monthly_avg > 0
        GROUP BY g.district
        ORDER BY avg_monthly_sales DESC
    """
    return fetch_all(db, sql)


@router.get("/by-outlet-type")
def by_outlet_type(segment: Segment = SegmentParam(), db: Session = Depends(get_db)) -> list[dict]:
    sql = f"""
        SELECT g.outlet_type, round(avg(fb.sales_monthly_avg), 0) AS avg_monthly_sales, count(*) AS outlet_count
        FROM warehouse.fact_business fb
        JOIN {geo_source(segment)} g ON g.outlet_id = fb.outlet_id
        WHERE fb.sales_monthly_avg IS NOT NULL AND fb.sales_monthly_avg > 0 AND g.outlet_type IS NOT NULL
        GROUP BY g.outlet_type
        ORDER BY avg_monthly_sales DESC
    """
    return fetch_all(db, sql)


@router.get("/top-outlets")
def top_outlets(
    limit: int = Query(20, le=200),
    segment: Segment = SegmentParam(),
    db: Session = Depends(get_db),
) -> list[dict]:
    sql = f"""
        SELECT g.outlet_id, g.outlet_name, g.district, g.taluk, g.outlet_type, fb.sales_monthly_avg
        FROM warehouse.fact_business fb
        JOIN {geo_source(segment)} g ON g.outlet_id = fb.outlet_id
        WHERE fb.sales_monthly_avg IS NOT NULL
        ORDER BY fb.sales_monthly_avg DESC
        LIMIT :limit
    """
    return fetch_all(db, sql, {"limit": limit})


@router.get("/category-depth-correlation")
def category_depth_correlation(
    segment: Segment = SegmentParam(), db: Session = Depends(get_db)
) -> list[dict]:
    """Average sales bucketed by how many categories an outlet stocks —
    does a wider assortment actually track with higher reported sales?
    """
    # The segment is applied inside the `depth` CTE so the banding is computed
    # over the filtered population, not computed statewide and filtered after.
    sql = f"""
        WITH depth AS (
            SELECT outlet_id, count(*) FILTER (WHERE available) AS categories_stocked
            FROM warehouse.fact_outlet_category
            WHERE true{outlet_scope(segment, "outlet_id")}
            GROUP BY outlet_id
        )
        SELECT
            CASE
                WHEN d.categories_stocked <= 5 THEN '1-5'
                WHEN d.categories_stocked <= 10 THEN '6-10'
                WHEN d.categories_stocked <= 15 THEN '11-15'
                ELSE '16-22'
            END AS category_depth_band,
            round(avg(fb.sales_monthly_avg), 0) AS avg_monthly_sales,
            count(*) AS outlet_count
        FROM depth d
        JOIN warehouse.fact_business fb ON fb.outlet_id = d.outlet_id
        WHERE fb.sales_monthly_avg IS NOT NULL AND fb.sales_monthly_avg > 0
        GROUP BY 1
        ORDER BY min(d.categories_stocked)
    """
    return fetch_all(db, sql)
