"""add outlet geo view

Revision ID: 8b9ded62d9a2
Revises: f039b0caa3e7
Create Date: 2026-07-07 14:30:11.384206

A single pre-joined view is the base for nearly every analytics query in the
API — without it, every endpoint would repeat the same 5-table join and the
Karnataka-only filter. Excludes the 9 out-of-state rows (is_valid_karnataka)
so no downstream query has to remember to filter them.
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '8b9ded62d9a2'
down_revision: Union[str, Sequence[str], None] = 'f039b0caa3e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


CREATE_VIEW = """
CREATE VIEW warehouse.v_outlet_geo AS
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
    own.ownership_name AS ownership
FROM warehouse.outlet o
JOIN warehouse.dim_geography g ON g.geography_id = o.geography_id
JOIN warehouse.dim_district_alias a ON a.raw_district_name = g.district AND a.is_valid_karnataka = true
LEFT JOIN warehouse.dim_outlet_type ot ON ot.outlet_type_id = o.outlet_type_id
LEFT JOIN warehouse.dim_channel ch ON ch.channel_id = o.channel_id
LEFT JOIN warehouse.dim_outlet_class oc ON oc.outlet_class_id = o.outlet_class_id
LEFT JOIN warehouse.dim_ownership own ON own.ownership_id = o.ownership_id
"""


def upgrade() -> None:
    op.execute(CREATE_VIEW)


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS warehouse.v_outlet_geo")
