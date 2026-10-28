#!/usr/bin/env python3
"""Backfill metro_flag on warehouse.outlet and staging.outlets_clean.

Classifies every outlet as Metro / Non-Metro / Unknown from the coordinates
already in Postgres, using the rule in gt_database.metro_data.

Why compute from the database rather than import the flagged spreadsheet:
the flag is a pure function of Latitude + Longitude, and those columns are
already loaded (103,631 rows in both tables, keyed by source_row_id). Reading
the flag back out of the export would mean joining 100k rows on position —
the export carries no stable key — and a single inserted or reordered row
would misalign every flag after it, silently. Deriving it here is the same
answer with no join to get wrong, and it stays reproducible: re-run this after
any reload and the column is rebuilt from the coordinates that shipped with it.

Usage:
    python -m scripts.backfill_metro_flag            # apply
    python -m scripts.backfill_metro_flag --dry-run  # report only, no writes
"""

from __future__ import annotations

import argparse
import os
import sys

from sqlalchemy import text

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from gt_database.metro_data import (  # noqa: E402
    CITIES,
    METROS,
    classification_sql,
    tier_sql,
    urban_sql,
)
from gt_database.session import get_engine  # noqa: E402

# (warehouse column, staging column, SQL builder)
COLUMNS = [
    ("metro_flag", "Metro Flag", classification_sql),
    ("city_tier", "City Tier", tier_sql),
    ("urban_rural", "Urban/Rural", urban_sql),
]


class _Rollback(Exception):
    """Raised to unwind engine.begin() without committing (used by --dry-run)."""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="report counts, write nothing")
    args = ap.parse_args()

    # warehouse.outlet stores lat/long as numeric; trig needs double precision.
    WH_LAT, WH_LON = "o.latitude::double precision", "o.longitude::double precision"
    # staging keeps the export's quoted, spaced headers.
    ST_LAT, ST_LON = 's."Latitude"', 's."Longitude"'

    engine = get_engine()
    with engine.begin() as conn:
        print(f"metro centres: {len(METROS)}    reference cities: {len(CITIES)}")

        print("\n--- distributions that will be written (warehouse.outlet) ---")
        for wh_col, _st_col, build in COLUMNS:
            rows = conn.execute(
                text(
                    f"SELECT {build(WH_LAT, WH_LON)} AS label, count(*) AS n "
                    f"FROM warehouse.outlet o GROUP BY 1 ORDER BY 2 DESC"
                )
            ).all()
            total = sum(n for _, n in rows)
            print(f"\n  {wh_col}")
            for label, n in rows:
                print(f"    {label:<24} {n:>7,}  {n / total * 100:5.1f}%")

        if args.dry_run:
            print("\n--dry-run: nothing written.")
            raise _Rollback

        print()
        wh_updated = st_updated = 0
        for wh_col, st_col, build in COLUMNS:
            print(f"writing {wh_col} ...")
            wh_updated = conn.execute(
                text(f"UPDATE warehouse.outlet o SET {wh_col} = {build(WH_LAT, WH_LON)}")
            ).rowcount
            st_updated = conn.execute(
                text(
                    f'UPDATE staging.outlets_clean s SET "{st_col}" = {build(ST_LAT, ST_LON)}'
                )
            ).rowcount

        # Both tables derive from the same coordinates, so any disagreement
        # means the two loads have drifted apart — worth failing loudly.
        checks = " OR ".join(
            f'o.{wh} IS DISTINCT FROM s."{st}"' for wh, st, _ in COLUMNS
        )
        mismatched = conn.execute(
            text(
                f"""
                SELECT count(*)
                FROM warehouse.outlet o
                JOIN staging.outlets_clean s ON s.source_row_id = o.source_row_id
                WHERE {checks}
                """
            )
        ).scalar_one()

        if mismatched:
            print(
                f"\nABORTED: {mismatched:,} rows disagree between warehouse and "
                f"staging. Rolling back — the two tables' coordinates differ.",
                file=sys.stderr,
            )
            raise RuntimeError("warehouse/staging classification mismatch")

        # The two documented identities must hold, or the rules have drifted
        # apart in a way that would make the segment control lie.
        bad_identity = conn.execute(
            text(
                """
                SELECT
                  count(*) FILTER (WHERE (metro_flag = 'Metro') <> (city_tier = 'Tier 1')) AS metro_vs_tier1,
                  count(*) FILTER (WHERE (urban_rural = 'Rural') <> (city_tier = 'Beyond Tier-3 (Rural)')) AS urban_vs_tier
                FROM warehouse.outlet
                """
            )
        ).one()
        if any(bad_identity):
            print(
                f"\nABORTED: identity checks failed "
                f"(metro≠tier1 on {bad_identity[0]:,} rows, "
                f"urban≠tier on {bad_identity[1]:,} rows). Rolling back.",
                file=sys.stderr,
            )
            raise RuntimeError("classification identity mismatch")

    print(f"\nwarehouse.outlet      updated: {wh_updated:,} rows x {len(COLUMNS)} columns")
    print(f"staging.outlets_clean updated: {st_updated:,} rows x {len(COLUMNS)} columns")
    print("warehouse/staging agreement: exact")
    print("identities hold: Metro == Tier 1, Rural == Beyond Tier-3")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except _Rollback:
        # --dry-run path: the transaction was discarded on the way out.
        raise SystemExit(0)
