"""Outlet segmentation — type/channel/class/ownership/age mix, statewide or
scoped to one district.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import fetch_all, get_db
from app.core.filters import Segment, SegmentParam, geo_source

router = APIRouter(prefix="/api/segmentation", tags=["segmentation"])


def _breakdown(db: Session, column: str, district: str | None, segment: Segment) -> list[dict]:
    where = "WHERE district = :district AND" if district else "WHERE"
    sql = f"""
        SELECT {column} AS label, count(*) AS outlet_count
        FROM {geo_source(segment)} AS g
        {where} {column} IS NOT NULL
        GROUP BY {column}
        ORDER BY outlet_count DESC
    """
    return fetch_all(db, sql, {"district": district} if district else None)


@router.get("/summary")
def summary(
    district: str | None = Query(None, description="Optional official district name to scope to"),
    segment: Segment = SegmentParam(),
    db: Session = Depends(get_db),
) -> dict:
    return {
        "outletType": _breakdown(db, "outlet_type", district, segment),
        "channel": _breakdown(db, "channel", district, segment),
        "outletClass": _breakdown(db, "outlet_class", district, segment),
        "ownership": _breakdown(db, "ownership", district, segment),
    }


@router.get("/age-distribution")
def age_distribution(segment: Segment = SegmentParam(), db: Session = Depends(get_db)) -> list[dict]:
    sql = f"""
        SELECT
            CASE
                WHEN outlet_age IS NULL THEN 'Unknown'
                WHEN outlet_age < 2 THEN '0-2 years'
                WHEN outlet_age < 5 THEN '2-5 years'
                WHEN outlet_age < 10 THEN '5-10 years'
                WHEN outlet_age < 20 THEN '10-20 years'
                ELSE '20+ years'
            END AS age_band,
            count(*) AS outlet_count
        FROM {geo_source(segment)} AS g
        GROUP BY 1
        ORDER BY min(coalesce(outlet_age, -1))
    """
    return fetch_all(db, sql)


@router.get("/size-proxy")
def size_proxy(segment: Segment = SegmentParam(), db: Session = Depends(get_db)) -> list[dict]:
    """Employee count as a size proxy — buckets, not a raw scatter, since the
    distribution is heavily right-skewed (a handful of large-format stores).
    """
    sql = f"""
        SELECT
            CASE
                WHEN employee_count IS NULL THEN 'Unknown'
                WHEN employee_count <= 1 THEN 'Solo (0-1)'
                WHEN employee_count <= 3 THEN 'Small (2-3)'
                WHEN employee_count <= 7 THEN 'Medium (4-7)'
                ELSE 'Large (8+)'
            END AS size_band,
            count(*) AS outlet_count
        FROM {geo_source(segment)} AS g
        GROUP BY 1
        ORDER BY min(coalesce(employee_count, -1))
    """
    return fetch_all(db, sql)
