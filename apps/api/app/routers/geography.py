"""Geographic / Spatial analysis — real outlet-level lat/long, no PostGIS
required (haversine done in plain SQL; see infra/README.md for why PostGIS
isn't installed on this server yet).
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import fetch_all, get_db
from app.core.filters import Segment, SegmentParam, geo_source

router = APIRouter(prefix="/api/geography", tags=["geography"])


@router.get("/districts")
def districts(segment: Segment = SegmentParam(), db: Session = Depends(get_db)) -> list[dict]:
    """Outlet count, taluk count, and geographic centroid per district —
    the base dataset for the choropleth map and district rankings.
    """
    sql = f"""
        SELECT
            district,
            count(*) AS outlet_count,
            count(DISTINCT taluk) AS taluk_count,
            round(avg(latitude)::numeric, 6) AS avg_lat,
            round(avg(longitude)::numeric, 6) AS avg_lng
        FROM {geo_source(segment)} AS g
        GROUP BY district
        ORDER BY outlet_count DESC
    """
    return fetch_all(db, sql)


@router.get("/taluks")
def taluks(
    district: str = Query(..., description="Official district name"),
    segment: Segment = SegmentParam(),
    db: Session = Depends(get_db),
) -> list[dict]:
    """Taluk-level breakdown within one district — the drill-down from the
    district map, and the basis for taluk-level whitespace detection.
    """
    sql = f"""
        SELECT taluk, count(*) AS outlet_count, count(DISTINCT city) AS city_count
        FROM {geo_source(segment)} AS g
        WHERE district = :district
        GROUP BY taluk
        ORDER BY outlet_count DESC
    """
    return fetch_all(db, sql, {"district": district})


@router.get("/clusters")
def clusters(
    precision: int = Query(2, ge=1, le=4, description="Decimal places to round lat/lng to — 2 ≈ 1.1km grid cells"),
    segment: Segment = SegmentParam(),
    db: Session = Depends(get_db),
) -> list[dict]:
    """Grid-based point density for a bubble/heat map — bucketing 100k+ raw
    points into grid cells server-side instead of shipping every point to
    the browser.
    """
    sql = f"""
        SELECT
            round(latitude, {precision}) AS lat,
            round(longitude, {precision}) AS lng,
            count(*) AS outlet_count,
            mode() WITHIN GROUP (ORDER BY district) AS district
        FROM {geo_source(segment)} AS g
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        GROUP BY round(latitude, {precision}), round(longitude, {precision})
        HAVING count(*) >= 3
        ORDER BY outlet_count DESC
    """
    return fetch_all(db, sql)


@router.get("/whitespace")
def whitespace(segment: Segment = SegmentParam(), db: Session = Depends(get_db)) -> list[dict]:
    """Taluks sitting well below their own district's median taluk outlet
    count — a relative (not per-capita, since we have no population data)
    signal of under-covered areas worth field-verifying.
    """
    sql = f"""
        WITH taluk_counts AS (
            SELECT district, taluk, count(*) AS outlet_count
            FROM {geo_source(segment)} AS g
            GROUP BY district, taluk
        ),
        district_medians AS (
            SELECT district, percentile_cont(0.5) WITHIN GROUP (ORDER BY outlet_count) AS median_count
            FROM taluk_counts
            GROUP BY district
        )
        SELECT t.district, t.taluk, t.outlet_count, round(d.median_count::numeric, 0) AS district_median
        FROM taluk_counts t
        JOIN district_medians d ON d.district = t.district
        WHERE t.outlet_count < d.median_count * 0.3
        ORDER BY t.outlet_count ASC
        LIMIT 30
    """
    return fetch_all(db, sql)


@router.get("/nearby")
def nearby(
    lat: float = Query(..., description="Latitude of the search center"),
    lng: float = Query(..., description="Longitude of the search center"),
    radius_km: float = Query(5.0, gt=0, le=50),
    limit: int = Query(50, le=500),
    segment: Segment = SegmentParam(),
    db: Session = Depends(get_db),
) -> list[dict]:
    """Outlets within a radius of a point — catchment-area / distributor
    territory queries. Haversine in plain SQL since PostGIS isn't installed.
    """
    sql = f"""
        WITH distances AS (
            SELECT outlet_id, outlet_name, district, taluk, city, latitude, longitude, outlet_type,
                   6371 * acos(
                       LEAST(1.0, GREATEST(-1.0,
                           cos(radians(:lat)) * cos(radians(latitude)) * cos(radians(longitude) - radians(:lng))
                           + sin(radians(:lat)) * sin(radians(latitude))
                       ))
                   ) AS distance_km
            FROM {geo_source(segment)} AS g
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        )
        SELECT * FROM distances
        WHERE distance_km <= :radius_km
        ORDER BY distance_km ASC
        LIMIT :limit
    """
    return fetch_all(db, sql, {"lat": lat, "lng": lng, "radius_km": radius_km, "limit": limit})
