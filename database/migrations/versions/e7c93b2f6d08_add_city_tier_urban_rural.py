"""add city tier and urban/rural

Revision ID: e7c93b2f6d08
Revises: d5a2e83f14c7
Create Date: 2026-08-21

Two further coordinate-derived labels alongside metro_flag: city_tier (Tier 1 /
Tier 2 / Tier 3 / Beyond Tier-3 (Rural)) and urban_rural.

Both are stored rather than computed per query for the same reason metro_flag
is — the segment control filters 103k rows on every page load, and an indexed
column beats re-running 32 haversines per row.

Note the two are not independent of each other or of metro_flag: Tier 1 selects
exactly the same outlets as Metro, and urban_rural is recoverable from
city_tier. They are kept as separate columns to mirror the classified export
column-for-column; gt_database.metro_data documents the overlap so nothing
downstream mistakes them for three independent signals.

Also rebuilds v_outlet_geo to expose them, since that view is what the API
reads. The rule lives in gt_database.metro_data; scripts/backfill_metro_flag.py
applies it.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e7c93b2f6d08'
down_revision: Union[str, Sequence[str], None] = 'd5a2e83f14c7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_TIERS = ("Tier 1", "Tier 2", "Tier 3", "Beyond Tier-3 (Rural)", "Unknown")
_URBAN = ("Urban", "Rural", "Unknown")

_VIEW_BODY = """
SELECT
    o.outlet_id,
    o.outlet_name,
    a.official_district_name AS district,
    g.taluk,
    g.city,
    g.pincode,
    o.latitude,
    o.longitude,
    o.outlet_age,
    o.employee_count,
    o.sale_option,
    o.purchase_option,
    ot.type_name AS outlet_type,
    ch.channel_name AS channel,
    oc.class_name AS outlet_class,
    own.ownership_name AS ownership,
    o.metro_flag{extra}
FROM warehouse.outlet o
JOIN warehouse.dim_geography g ON g.geography_id = o.geography_id
JOIN warehouse.dim_district_alias a ON a.raw_district_name = g.district AND a.is_valid_karnataka = true
LEFT JOIN warehouse.dim_outlet_type ot ON ot.outlet_type_id = o.outlet_type_id
LEFT JOIN warehouse.dim_channel ch ON ch.channel_id = o.channel_id
LEFT JOIN warehouse.dim_outlet_class oc ON oc.outlet_class_id = o.outlet_class_id
LEFT JOIN warehouse.dim_ownership own ON own.ownership_id = o.ownership_id
"""


def _recreate_view(extra: str) -> str:
    return (
        "DROP VIEW IF EXISTS warehouse.v_outlet_geo;\n"
        "CREATE VIEW warehouse.v_outlet_geo AS"
        + _VIEW_BODY.format(extra=extra)
    )


def upgrade() -> None:
    op.add_column(
        "outlet",
        sa.Column("city_tier", sa.String(24), nullable=True,
                  comment="Tier 1/2/3, Beyond Tier-3 (Rural), or Unknown — derived from latitude+longitude"),
        schema="warehouse",
    )
    op.add_column(
        "outlet",
        sa.Column("urban_rural", sa.String(10), nullable=True,
                  comment="Urban / Rural / Unknown — derived from latitude+longitude"),
        schema="warehouse",
    )
    op.create_index("ix_outlet_city_tier", "outlet", ["city_tier"], schema="warehouse")
    op.create_index("ix_outlet_urban_rural", "outlet", ["urban_rural"], schema="warehouse")
    op.create_check_constraint(
        "ck_outlet_city_tier", "outlet", sa.column("city_tier").in_(_TIERS), schema="warehouse"
    )
    op.create_check_constraint(
        "ck_outlet_urban_rural", "outlet", sa.column("urban_rural").in_(_URBAN), schema="warehouse"
    )

    op.add_column("outlets_clean", sa.Column("City Tier", sa.Text(), nullable=True), schema="staging")
    op.add_column("outlets_clean", sa.Column("Urban/Rural", sa.Text(), nullable=True), schema="staging")

    op.execute(_recreate_view(",\n    o.city_tier,\n    o.urban_rural"))


def downgrade() -> None:
    op.execute(_recreate_view(""))
    op.drop_column("outlets_clean", "Urban/Rural", schema="staging")
    op.drop_column("outlets_clean", "City Tier", schema="staging")
    op.drop_constraint("ck_outlet_urban_rural", "outlet", schema="warehouse", type_="check")
    op.drop_constraint("ck_outlet_city_tier", "outlet", schema="warehouse", type_="check")
    op.drop_index("ix_outlet_urban_rural", "outlet", schema="warehouse")
    op.drop_index("ix_outlet_city_tier", "outlet", schema="warehouse")
    op.drop_column("outlet", "urban_rural", schema="warehouse")
    op.drop_column("outlet", "city_tier", schema="warehouse")
