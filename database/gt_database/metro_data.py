"""Geographic classification of outlets, all derived from coordinates.

Three labels, each a pure function of (latitude, longitude):

* metro_flag  — Metro / Non-Metro / Unknown, by distance to a major Indian metro
* city_tier   — Tier 1 / Tier 2 / Tier 3 / Beyond Tier-3 (Rural) / Unknown,
                by distance to the nearest reference city, highest tier winning
* urban_rural — Urban / Rural / Unknown; Urban means inside some town's radius

This module is the single definition of those rules. The backfill script and
any future ETL run both import from here, so re-running the classification
cannot drift from what is already stored.

Two relationships are worth knowing before building on these, because both are
exact in the Karnataka census rather than approximate:

* `metro_flag == Metro` and `city_tier == Tier 1` select the same 61,790
  outlets. Bengaluru is the only Tier-1 city in the state and the only metro
  the data can reach, so the two rules coincide.
* `urban_rural` is recoverable from `city_tier`: Urban is Tiers 1-3, Rural is
  Beyond Tier-3. It is stored anyway to match the export column-for-column, but
  nothing should treat it as independent evidence.

Note on this dataset: the census covers Karnataka, so of the metro centres only
Bengaluru can match. The rest are listed to keep the rule general (and correct
if the census is ever extended beyond the state), not because they classify
anything today.
"""

from __future__ import annotations

import math

# name -> (latitude, longitude, urban radius in km)
# Edit this to change what counts as a metro; everything downstream follows.
METROS: dict[str, tuple[float, float, float]] = {
    "Bengaluru": (12.9716, 77.5946, 35),
    "Mumbai": (19.0760, 72.8777, 40),
    "Delhi (NCR)": (28.6139, 77.2090, 45),
    "Chennai": (13.0827, 80.2707, 35),
    "Kolkata": (22.5726, 88.3639, 35),
    "Hyderabad": (17.3850, 78.4867, 35),
    "Pune": (18.5204, 73.8567, 30),
    "Ahmedabad": (23.0225, 72.5714, 30),
}

# Plausible coordinate bounds for India — catches nulls, zeroes, and swapped
# lat/long pairs, which would otherwise land somewhere in the Indian Ocean and
# be silently classified "Non-Metro".
LAT_MIN, LAT_MAX = 6.0, 37.5
LON_MIN, LON_MAX = 68.0, 97.5

METRO = "Metro"
NON_METRO = "Non-Metro"
UNKNOWN = "Unknown"

TIER_1 = "Tier 1"
TIER_2 = "Tier 2"
TIER_3 = "Tier 3"
BEYOND_TIER_3 = "Beyond Tier-3 (Rural)"

URBAN = "Urban"
RURAL = "Rural"

# name -> (latitude, longitude, tier, urban radius in km)
# Tier 1 is Bengaluru alone; Tier 2 the regional hubs; Tier 3 the district-HQ
# towns present in the census. An outlet takes the tier of the first city whose
# radius contains it, tested 1 → 2 → 3, so overlapping radii resolve to the
# larger city rather than to whichever happened to be listed first.
CITIES: dict[str, tuple[float, float, int, float]] = {
    # Tier 1
    "Bengaluru": (12.9716, 77.5946, 1, 35),
    # Tier 2 — regional hubs
    "Mysuru": (12.2958, 76.6394, 2, 18),
    "Mangaluru": (12.9141, 74.8560, 2, 18),
    "Hubballi": (15.3647, 75.1240, 2, 18),
    "Dharwad": (15.4589, 75.0078, 2, 18),
    "Belagavi": (15.8497, 74.4977, 2, 18),
    "Kalaburagi": (17.3297, 76.8343, 2, 18),
    "Davangere": (14.4644, 75.9218, 2, 18),
    "Shivamogga": (13.9299, 75.5681, 2, 18),
    "Ballari": (15.1394, 76.9214, 2, 18),
    "Vijayapura": (16.8302, 75.7100, 2, 18),
    # Tier 3 — district HQs / smaller towns
    "Tumakuru": (13.3379, 77.1173, 3, 12),
    "Hassan": (13.0072, 76.0962, 3, 12),
    "Raichur": (16.2076, 77.3463, 3, 12),
    "Udupi": (13.3409, 74.7421, 3, 12),
    "Mandya": (12.5223, 76.8954, 3, 12),
    "Bidar": (17.9106, 77.5199, 3, 12),
    "Chitradurga": (14.2251, 76.3980, 3, 12),
    "Gadag": (15.4315, 75.6355, 3, 12),
    "Koppal": (15.3547, 76.1548, 3, 12),
    "Haveri": (14.7935, 75.4044, 3, 12),
    "Ramanagara": (12.7217, 77.2807, 3, 12),
    "Chikkamagaluru": (13.3161, 75.7720, 3, 12),
    "Karwar": (14.8137, 74.1298, 3, 12),
    "Sirsi": (14.6195, 74.8354, 3, 12),
    "Chamarajanagar": (11.9261, 76.9407, 3, 12),
    "Yadgir": (16.7700, 77.1376, 3, 12),
    "Kolar": (13.1367, 78.1292, 3, 12),
    "Madikeri": (12.4218, 75.7382, 3, 12),
    "Hosapete": (15.2695, 76.3871, 3, 12),
    "Bagalkot": (16.1691, 75.6615, 3, 12),
    "Chikkaballapura": (13.4355, 77.7315, 3, 12),
}

_TIER_LABEL = {1: TIER_1, 2: TIER_2, 3: TIER_3}

EARTH_RADIUS_KM = 6371.0


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two points, in kilometres."""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(a))


def _coords(lat: float | None, lon: float | None) -> tuple[float, float] | None:
    """Validated (lat, lon), or None when the pair cannot be trusted."""
    if lat is None or lon is None:
        return None
    try:
        lat = float(lat)
        lon = float(lon)
    except (TypeError, ValueError):
        return None
    if math.isnan(lat) or math.isnan(lon):
        return None
    if not (LAT_MIN <= lat <= LAT_MAX and LON_MIN <= lon <= LON_MAX):
        return None
    # A row where latitude equals longitude is a data-entry artefact, not a
    # place — it would otherwise plot on the 45° line and classify as Rural.
    if lat == lon:
        return None
    return lat, lon


def classify(lat: float | None, lon: float | None) -> str:
    """Return METRO / NON_METRO / UNKNOWN for one coordinate pair."""
    c = _coords(lat, lon)
    if c is None:
        return UNKNOWN
    for mlat, mlon, radius in METROS.values():
        if haversine_km(c[0], c[1], mlat, mlon) <= radius:
            return METRO
    return NON_METRO


def classify_tier(lat: float | None, lon: float | None) -> str:
    """Return the city tier, testing tier 1 first so bigger cities win."""
    c = _coords(lat, lon)
    if c is None:
        return UNKNOWN
    for want in (1, 2, 3):
        for clat, clon, tier, radius in CITIES.values():
            if tier == want and haversine_km(c[0], c[1], clat, clon) <= radius:
                return _TIER_LABEL[want]
    return BEYOND_TIER_3


def classify_urban(lat: float | None, lon: float | None) -> str:
    """Urban when inside any classified town's radius, else Rural."""
    tier = classify_tier(lat, lon)
    if tier == UNKNOWN:
        return UNKNOWN
    return RURAL if tier == BEYOND_TIER_3 else URBAN


def _haversine_sql(lat_expr: str, lon_expr: str, clat: float, clon: float) -> str:
    return f"""2 * {EARTH_RADIUS_KM} * asin(sqrt(
                power(sin(radians({clat} - {lat_expr}) / 2), 2)
              + cos(radians({lat_expr})) * cos(radians({clat}))
                * power(sin(radians({clon} - {lon_expr}) / 2), 2)
            ))"""


def _invalid_sql(lat_expr: str, lon_expr: str) -> str:
    """The shared "these coordinates cannot be trusted" test."""
    return f"""(
        {lat_expr} IS NULL OR {lon_expr} IS NULL
        OR NOT ({lat_expr} BETWEEN {LAT_MIN} AND {LAT_MAX}
            AND {lon_expr} BETWEEN {LON_MIN} AND {LON_MAX})
        OR {lat_expr} = {lon_expr}
    )"""


def classification_sql(lat_expr: str, lon_expr: str) -> str:
    """Metro rule as a SQL CASE expression.

    Generated from METROS rather than hand-written so the SQL backfill and the
    Python classifier cannot disagree. `lat_expr` / `lon_expr` are the column
    references to classify (cast to double precision by the caller if needed).
    """
    within = " OR ".join(
        f"({_haversine_sql(lat_expr, lon_expr, mlat, mlon)} <= {radius})"
        for mlat, mlon, radius in METROS.values()
    )
    return f"""
        CASE
            WHEN {_invalid_sql(lat_expr, lon_expr)} THEN '{UNKNOWN}'
            WHEN ({within}) THEN '{METRO}'
            ELSE '{NON_METRO}'
        END
    """


def tier_sql(lat_expr: str, lon_expr: str) -> str:
    """City-tier rule as SQL. Tiers are tested in order, so a point inside two
    radii takes the higher tier — the same precedence as classify_tier()."""
    branches = []
    for want in (1, 2, 3):
        within = " OR ".join(
            f"({_haversine_sql(lat_expr, lon_expr, clat, clon)} <= {radius})"
            for clat, clon, tier, radius in CITIES.values()
            if tier == want
        )
        branches.append(f"WHEN ({within}) THEN '{_TIER_LABEL[want]}'")
    joined = "\n            ".join(branches)
    return f"""
        CASE
            WHEN {_invalid_sql(lat_expr, lon_expr)} THEN '{UNKNOWN}'
            {joined}
            ELSE '{BEYOND_TIER_3}'
        END
    """


def urban_sql(lat_expr: str, lon_expr: str) -> str:
    """Urban/Rural as SQL, expressed through the tier rule so the two columns
    can never disagree about what counts as a town."""
    return f"""
        CASE
            WHEN {_invalid_sql(lat_expr, lon_expr)} THEN '{UNKNOWN}'
            WHEN ({tier_sql(lat_expr, lon_expr)}) = '{BEYOND_TIER_3}' THEN '{RURAL}'
            ELSE '{URBAN}'
        END
    """
