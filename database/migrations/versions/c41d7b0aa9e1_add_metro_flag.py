"""add metro flag

Revision ID: c41d7b0aa9e1
Revises: 8b9ded62d9a2
Create Date: 2026-08-21

Adds a metro / non-metro classification derived from each outlet's coordinates.

The column is added in two places for the same reason the two tables exist:
`staging.outlets_clean` mirrors the field export (so the flag sits alongside the
Latitude / Longitude it was derived from, matching that table's spaced-and-
quoted header convention), and `warehouse.outlet` carries it in query shape for
the API to filter on.

The rule itself lives in gt_database.metro_data, so the backfill and any later
ETL run share one definition. This migration only creates the column and its
index — the classification is applied by scripts/backfill_metro_flag.py, kept
separate so a schema upgrade never silently rewrites 103k rows of data.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c41d7b0aa9e1'
down_revision: Union[str, Sequence[str], None] = '8b9ded62d9a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_ALLOWED = ("Metro", "Non-Metro", "Unknown")


def upgrade() -> None:
    op.add_column(
        "outlet",
        sa.Column(
            "metro_flag",
            sa.String(10),
            nullable=True,
            comment="Metro / Non-Metro / Unknown, derived from latitude+longitude",
        ),
        schema="warehouse",
    )
    # Partial-free plain index: the toggle filters on this column on every one
    # of the four live pages, across 103k rows.
    op.create_index(
        "ix_outlet_metro_flag", "outlet", ["metro_flag"], schema="warehouse"
    )
    op.create_check_constraint(
        "ck_outlet_metro_flag",
        "outlet",
        sa.column("metro_flag").in_(_ALLOWED),
        schema="warehouse",
    )

    # Staging mirrors the export's header style ("Metro Flag"), matching the
    # quoted, spaced column names already in that table.
    op.add_column(
        "outlets_clean",
        sa.Column("Metro Flag", sa.Text(), nullable=True),
        schema="staging",
    )


def downgrade() -> None:
    op.drop_column("outlets_clean", "Metro Flag", schema="staging")
    op.drop_constraint(
        "ck_outlet_metro_flag", "outlet", schema="warehouse", type_="check"
    )
    op.drop_index("ix_outlet_metro_flag", "outlet", schema="warehouse")
    op.drop_column("outlet", "metro_flag", schema="warehouse")
