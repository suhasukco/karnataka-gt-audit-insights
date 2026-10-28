"""Shared settlement-segment filter.

Every analytics endpoint takes an optional `?segment=` so the four live pages
can be read one segment at a time. The value is an Enum, never free text, so
the literals interpolated below cannot carry user input.

ONE parameter, not three, and that is deliberate. The census carries three
coordinate-derived labels, but they are not independent:

    metro_flag == 'Metro'   selects exactly the same outlets as
    city_tier  == 'Tier 1'                                            (61,790)

    urban_rural == 'Rural'  selects exactly the same outlets as
    city_tier  == 'Beyond Tier-3 (Rural)'                             (10,479)

Bengaluru is the only Tier-1 city in Karnataka and the only metro the data
reaches, so metro and tier-1 coincide; and Urban is just "any tier at all".
Exposing three separate filters would let someone ask for Metro + Rural, which
is not a narrow result — it is an empty one, and an empty chart reads as a bug
rather than as a contradiction in the question. A single selector cannot
express the contradiction, so it never has to explain it.

Two helpers because the routers have two query shapes:

* `geo_source()`  — for the ~17 queries whose base is `warehouse.v_outlet_geo`.
  Swaps the view for a filtered subquery, which composes with any WHERE, GROUP
  BY, or CTE the caller already has.
* `outlet_scope()` — for the handful that read a fact table directly with no
  geography join. Returns an AND-able predicate restricting the fact's
  outlet_id to the segment.

Both are no-ops for `all`, so the unfiltered query is byte-identical to what it
was before this parameter existed.
"""

from __future__ import annotations

from enum import Enum

from fastapi import Query

GEO_VIEW = "warehouse.v_outlet_geo"


class Segment(str, Enum):
    ALL = "all"
    # Coarse split
    METRO = "metro"
    NON_METRO = "non-metro"
    # Settlement density
    URBAN = "urban"
    RURAL = "rural"
    # Fine split
    TIER_1 = "tier-1"
    TIER_2 = "tier-2"
    TIER_3 = "tier-3"


# Each segment maps to one predicate against the view's stored labels.
# "Unknown" (38 outlets whose coordinates could not be trusted) matches no
# segment and is therefore only ever visible under `all`.
_PREDICATE: dict[Segment, str] = {
    Segment.METRO: "metro_flag = 'Metro'",
    Segment.NON_METRO: "metro_flag = 'Non-Metro'",
    Segment.URBAN: "urban_rural = 'Urban'",
    Segment.RURAL: "urban_rural = 'Rural'",
    Segment.TIER_1: "city_tier = 'Tier 1'",
    Segment.TIER_2: "city_tier = 'Tier 2'",
    Segment.TIER_3: "city_tier = 'Tier 3'",
}


def SegmentParam() -> Segment:  # noqa: N802 — used as a FastAPI dependency default
    """Declare the shared `?segment=` query parameter."""
    return Query(
        Segment.ALL,
        description=(
            "Restrict to one settlement segment. 'all' is the only value that "
            "includes the 38 outlets whose coordinates could not be classified. "
            "Note 'metro' and 'tier-1' select the same outlets in this census."
        ),
    )


def geo_source(segment: Segment) -> str:
    """Source expression to substitute for `warehouse.v_outlet_geo`."""
    if segment is Segment.ALL:
        return GEO_VIEW
    return f"(SELECT * FROM {GEO_VIEW} WHERE {_PREDICATE[segment]})"


def outlet_scope(segment: Segment, column: str) -> str:
    """AND-able predicate restricting an outlet_id column to the segment.

    Returns '' for `all` so callers can concatenate unconditionally.
    """
    if segment is Segment.ALL:
        return ""
    return (
        f" AND {column} IN (SELECT outlet_id FROM {GEO_VIEW}"
        f" WHERE {_PREDICATE[segment]})"
    )


# Backwards-compatible aliases: the routers were written against the earlier
# metro-only names, and every call site passes the value straight through to
# the helpers above, so only the names need bridging.
Metro = Segment
MetroParam = SegmentParam
