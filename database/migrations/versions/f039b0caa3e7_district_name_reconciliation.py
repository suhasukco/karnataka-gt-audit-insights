"""district name reconciliation

Revision ID: f039b0caa3e7
Revises: a06ca106145a
Create Date: 2026-07-07 14:28:28.129798

Adds dim_district_alias, reconciling the 43 raw district-name spellings found
in the real 103,631-row load to the 31 official Karnataka district names the
frontend's GeoJSON choropleth is keyed on.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from gt_database.district_alias_data import DISTRICT_ALIASES

# revision identifiers, used by Alembic.
revision: str = 'f039b0caa3e7'
down_revision: Union[str, Sequence[str], None] = 'a06ca106145a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "dim_district_alias",
        sa.Column("raw_district_name", sa.String(100), primary_key=True),
        sa.Column("official_district_name", sa.String(100), nullable=False),
        sa.Column("is_valid_karnataka", sa.Boolean, nullable=False, server_default=sa.true()),
        schema="warehouse",
    )
    op.create_index("ix_district_alias_official", "dim_district_alias", ["official_district_name"], schema="warehouse")

    alias_table = sa.table(
        "dim_district_alias",
        sa.column("raw_district_name", sa.String),
        sa.column("official_district_name", sa.String),
        sa.column("is_valid_karnataka", sa.Boolean),
        schema="warehouse",
    )
    op.bulk_insert(
        alias_table,
        [
            {"raw_district_name": raw, "official_district_name": official, "is_valid_karnataka": valid}
            for raw, official, valid in DISTRICT_ALIASES
        ],
    )


def downgrade() -> None:
    op.drop_table("dim_district_alias", schema="warehouse")
