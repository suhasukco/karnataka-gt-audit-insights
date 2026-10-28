"""expose metro_flag on v_outlet_geo

Revision ID: d5a2e83f14c7
Revises: c41d7b0aa9e1
Create Date: 2026-08-21

Nearly every analytics endpoint reads warehouse.v_outlet_geo rather than the
outlet table, so metro_flag has to surface on the view before the API can
filter on it. Column added at the end of the select list; everything else is
byte-identical to 8b9ded62d9a2 so this is purely additive for existing callers.
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'd5a2e83f14c7'
down_revision: Union[str, Sequence[str], None] = 'c41d7b0aa9e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_SELECT_LIST = """
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
"""

_FROM = """
FROM warehouse.outlet o
JOIN warehouse.dim_geography g ON g.geography_id = o.geography_id
JOIN warehouse.dim_district_alias a ON a.raw_district_name = g.district AND a.is_valid_karnataka = true
LEFT JOIN warehouse.dim_outlet_type ot ON ot.outlet_type_id = o.outlet_type_id
LEFT JOIN warehouse.dim_channel ch ON ch.channel_id = o.channel_id
LEFT JOIN warehouse.dim_outlet_class oc ON oc.outlet_class_id = o.outlet_class_id
LEFT JOIN warehouse.dim_ownership own ON own.ownership_id = o.ownership_id
"""

# CREATE OR REPLACE cannot add a column to an existing view in Postgres — it
# requires the same column list in the same order. Drop and recreate instead.
WITH_METRO = f"""
DROP VIEW IF EXISTS warehouse.v_outlet_geo;
CREATE VIEW warehouse.v_outlet_geo AS
SELECT {_SELECT_LIST},
    o.metro_flag
{_FROM}
"""

WITHOUT_METRO = f"""
DROP VIEW IF EXISTS warehouse.v_outlet_geo;
CREATE VIEW warehouse.v_outlet_geo AS
SELECT {_SELECT_LIST}
{_FROM}
"""


def upgrade() -> None:
    op.execute(WITH_METRO)


def downgrade() -> None:
    op.execute(WITHOUT_METRO)
