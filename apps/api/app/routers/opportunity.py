"""Opportunity Engine — the real-data version of the mock dashboard's
composite score.

Built from what this dataset actually contains: infrastructure gap, category
gap, digital gap, and (new, real, and arguably the sharpest signal here) the
tracked-brand white-space rate. There's no real population/income data loaded
yet, so "population potential" from the mock version is dropped rather than
faked — outlet density stands in as the reach signal instead.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import fetch_all, get_db
from app.core.filters import Segment, SegmentParam, geo_source

router = APIRouter(prefix="/api/opportunity", tags=["opportunity"])


def _normalize(values: list[float]) -> list[float]:
    lo, hi = min(values), max(values)
    if hi == lo:
        return [50.0 for _ in values]
    return [round((v - lo) / (hi - lo) * 100, 1) for v in values]


@router.get("/districts")
def districts(segment: Segment = SegmentParam(), db: Session = Depends(get_db)) -> list[dict]:
    sql = f"""
        WITH infra AS (
            SELECT g.district,
                   avg(case when fi.fridge_flag then 1 else 0 end
                     + case when fi.cooler_flag then 1 else 0 end
                     + case when fi.deep_freezer_flag then 1 else 0 end
                     + case when fi.display_rack_flag then 1 else 0 end
                     + case when fi.ac_flag then 1 else 0 end) / 5.0 * 100 AS infra_score,
                   avg(case when fb.billing_software_flag then 1 else 0 end
                     + case when fb.digital_payment_flag then 1 else 0 end
                     + case when fb.online_sales_flag then 1 else 0 end) / 3.0 * 100 AS digital_score
            FROM {geo_source(segment)} g
            JOIN warehouse.fact_infrastructure fi ON fi.outlet_id = g.outlet_id
            JOIN warehouse.fact_business fb ON fb.outlet_id = g.outlet_id
            GROUP BY g.district
        ),
        category AS (
            SELECT g.district, avg(case when f.available then 100.0 else 0 end) AS category_score
            FROM warehouse.fact_outlet_category f
            JOIN {geo_source(segment)} g ON g.outlet_id = f.outlet_id
            GROUP BY g.district
        ),
        brand_whitespace AS (
            SELECT dt.district, round(100.0 * coalesce(nc.none_count, 0) / dt.total, 1) AS brand_whitespace_pct
            FROM (SELECT district, count(*) AS total FROM {geo_source(segment)} AS dtot GROUP BY district) dt
            LEFT JOIN (
                SELECT g.district, count(DISTINCT ob.outlet_id) AS none_count
                FROM warehouse.fact_outlet_brand ob
                JOIN warehouse.dim_brand b ON b.brand_id = ob.brand_id
                JOIN {geo_source(segment)} g ON g.outlet_id = ob.outlet_id
                WHERE lower(b.brand_name) = 'none of the above'
                GROUP BY g.district
            ) nc ON nc.district = dt.district
        ),
        density AS (
            SELECT district, count(*) AS outlet_count, count(DISTINCT taluk) AS taluk_count
            FROM {geo_source(segment)} AS dens
            GROUP BY district
        )
        SELECT
            d.district, d.outlet_count,
            round(i.infra_score, 1) AS infra_score,
            round(i.digital_score, 1) AS digital_score,
            round(c.category_score, 1) AS category_score,
            bw.brand_whitespace_pct,
            round(d.outlet_count::numeric / d.taluk_count, 1) AS outlets_per_taluk
        FROM density d
        JOIN infra i ON i.district = d.district
        JOIN category c ON c.district = d.district
        JOIN brand_whitespace bw ON bw.district = d.district
        ORDER BY d.district
    """
    rows = fetch_all(db, sql)

    # Postgres numeric columns come back as decimal.Decimal via psycopg2, which
    # doesn't mix with float arithmetic below — cast to float up front.
    infra_gap = _normalize([100 - float(r["infra_score"]) for r in rows])
    category_gap = _normalize([100 - float(r["category_score"]) for r in rows])
    digital_gap = _normalize([100 - float(r["digital_score"]) for r in rows])
    brand_whitespace = _normalize([float(r["brand_whitespace_pct"]) for r in rows])
    density_score = _normalize([float(r["outlets_per_taluk"]) for r in rows])

    for i, r in enumerate(rows):
        r["infrastructureGap"] = infra_gap[i]
        r["categoryGap"] = category_gap[i]
        r["digitalGap"] = digital_gap[i]
        r["brandWhitespaceScore"] = brand_whitespace[i]
        r["densityScore"] = density_score[i]
        r["opportunityScore"] = round(
            infra_gap[i] * 0.25 + category_gap[i] * 0.25 + digital_gap[i] * 0.2 + brand_whitespace[i] * 0.2 + density_score[i] * 0.1,
            1,
        )

    rows.sort(key=lambda r: r["opportunityScore"], reverse=True)
    return rows
