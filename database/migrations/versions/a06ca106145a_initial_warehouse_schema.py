"""initial warehouse schema

Revision ID: a06ca106145a
Revises:
Create Date: 2026-07-07 11:24:28.144932

Creates the `warehouse` (analytics) and `restricted` (PII) schemas and every
table in them, enables PostGIS, and seeds the 22 real product categories.

`raw` and `staging` schemas are intentionally NOT created here — they are
owned and managed by the ETL scripts (etl/), which create/truncate/reload
them on every run. Only the stable, API-facing contract lives in Alembic.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry

from gt_database.seed_data import PRODUCT_CATEGORIES

# revision identifiers, used by Alembic.
revision: str = 'a06ca106145a'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS warehouse")
    op.execute("CREATE SCHEMA IF NOT EXISTS restricted")

    conn = op.get_bind()
    postgis_available = conn.execute(sa.text(
        "SELECT 1 FROM pg_available_extensions WHERE name = 'postgis'"
    )).scalar() is not None

    if postgis_available:
        op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    else:
        print(
            "WARNING: postgis extension is not installed on this Postgres server — "
            "skipping outlet.geom and its spatial index. latitude/longitude columns "
            "are unaffected. Install PostGIS (Stack Builder on Windows) and add a "
            "follow-up migration for outlet.geom later if spatial queries are needed."
        )

    # --- dimensions -------------------------------------------------------
    op.create_table(
        "dim_geography",
        sa.Column("geography_id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("state", sa.String(100), nullable=False),
        sa.Column("district", sa.String(100), nullable=False),
        sa.Column("taluk", sa.String(100), nullable=False),
        sa.Column("city", sa.String(150)),
        sa.Column("pincode", sa.String(10)),
        sa.UniqueConstraint("state", "district", "taluk", "city", "pincode", name="uq_geography_combo"),
        schema="warehouse",
    )
    op.create_index("ix_geography_district", "dim_geography", ["district"], schema="warehouse")
    op.create_index("ix_geography_taluk", "dim_geography", ["taluk"], schema="warehouse")
    op.create_index("ix_geography_city", "dim_geography", ["city"], schema="warehouse")
    op.create_index("ix_geography_pincode", "dim_geography", ["pincode"], schema="warehouse")

    op.create_table(
        "dim_outlet_type",
        sa.Column("outlet_type_id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("type_name", sa.String(100), nullable=False, unique=True),
        schema="warehouse",
    )
    op.create_table(
        "dim_channel",
        sa.Column("channel_id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("channel_name", sa.String(100), nullable=False, unique=True),
        schema="warehouse",
    )
    op.create_table(
        "dim_outlet_class",
        sa.Column("outlet_class_id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("class_name", sa.String(50), nullable=False, unique=True),
        schema="warehouse",
    )
    op.create_table(
        "dim_ownership",
        sa.Column("ownership_id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("ownership_name", sa.String(100), nullable=False, unique=True),
        schema="warehouse",
    )
    op.create_table(
        "dim_product_category",
        sa.Column("category_id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("category_name", sa.String(100), nullable=False, unique=True),
        sa.Column("display_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("has_sku_count", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("has_product_type_text", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("flag_only", sa.Boolean, nullable=False, server_default=sa.false()),
        schema="warehouse",
    )
    op.create_table(
        "dim_brand",
        sa.Column("brand_id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("brand_name", sa.String(150), nullable=False, unique=True),
        sa.Column("normalized_name", sa.String(150), nullable=False),
        schema="warehouse",
    )
    op.create_index("ix_brand_normalized_name", "dim_brand", ["normalized_name"], schema="warehouse")

    # --- core outlet table --------------------------------------------------
    outlet_columns = [
        sa.Column("outlet_id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("source_row_id", sa.Integer),
        sa.Column("outlet_name", sa.String(255), nullable=False),
        sa.Column("outlet_type_id", sa.Integer, sa.ForeignKey("warehouse.dim_outlet_type.outlet_type_id")),
        sa.Column("channel_id", sa.Integer, sa.ForeignKey("warehouse.dim_channel.channel_id")),
        sa.Column("outlet_class_id", sa.Integer, sa.ForeignKey("warehouse.dim_outlet_class.outlet_class_id")),
        sa.Column("ownership_id", sa.Integer, sa.ForeignKey("warehouse.dim_ownership.ownership_id")),
        sa.Column("outlet_age", sa.Integer),
        sa.Column("geography_id", sa.Integer, sa.ForeignKey("warehouse.dim_geography.geography_id"), nullable=False),
        sa.Column("street_address", sa.Text),
        sa.Column("landmark", sa.String(255)),
        sa.Column("in_and_around", sa.String(255)),
        sa.Column("gps_location_raw", sa.String(255)),
        sa.Column("latitude", sa.Numeric(9, 6)),
        sa.Column("longitude", sa.Numeric(9, 6)),
        sa.Column("employee_count", sa.Integer),
        sa.Column("sale_option", sa.String(50)),
        sa.Column("purchase_option", sa.String(50)),
        sa.Column("outlet_related_remarks", sa.Text),
        sa.Column("created_at", sa.TIMESTAMP, server_default=sa.func.now()),
    ]
    if postgis_available:
        outlet_columns.append(sa.Column("geom", Geometry(geometry_type="POINT", srid=4326, spatial_index=False)))

    op.create_table("outlet", *outlet_columns, schema="warehouse")

    op.create_index("ix_outlet_name", "outlet", ["outlet_name"], schema="warehouse")
    op.create_index("ix_outlet_geography_id", "outlet", ["geography_id"], schema="warehouse")
    op.create_index("ix_outlet_type_id", "outlet", ["outlet_type_id"], schema="warehouse")
    op.create_index("ix_outlet_channel_id", "outlet", ["channel_id"], schema="warehouse")
    op.create_index("ix_outlet_class_id", "outlet", ["outlet_class_id"], schema="warehouse")
    if postgis_available:
        op.create_index("ix_outlet_geom", "outlet", ["geom"], schema="warehouse", postgresql_using="gist")

    # --- 1:1 outlet detail facts -------------------------------------------
    op.create_table(
        "fact_infrastructure",
        sa.Column("outlet_id", sa.Integer, sa.ForeignKey("warehouse.outlet.outlet_id"), primary_key=True),
        sa.Column("shutters_count", sa.Integer),
        sa.Column("name_board_flag", sa.Boolean),
        sa.Column("fridge_flag", sa.Boolean),
        sa.Column("fridge_count", sa.Integer),
        sa.Column("cooler_flag", sa.Boolean),
        sa.Column("cooler_count", sa.Integer),
        sa.Column("deep_freezer_flag", sa.Boolean),
        sa.Column("deep_freezer_count", sa.Integer),
        sa.Column("display_rack_flag", sa.Boolean),
        sa.Column("display_rack_count", sa.Integer),
        sa.Column("chips_stand_flag", sa.Boolean),
        sa.Column("hanger_flag", sa.Boolean),
        sa.Column("cash_counter_display_flag", sa.Boolean),
        sa.Column("cash_counter_count", sa.Integer),
        sa.Column("poster_dangler_flag", sa.Boolean),
        sa.Column("promoter_flag", sa.Boolean),
        sa.Column("sampling_area_flag", sa.Boolean),
        sa.Column("ac_flag", sa.Boolean),
        sa.Column("cadbury_display_flag", sa.Boolean),
        schema="warehouse",
    )

    op.create_table(
        "fact_business",
        sa.Column("outlet_id", sa.Integer, sa.ForeignKey("warehouse.outlet.outlet_id"), primary_key=True),
        sa.Column("sales_monthly_avg", sa.Numeric(14, 2)),
        sa.Column("billing_software_flag", sa.Boolean),
        sa.Column("digital_payment_flag", sa.Boolean),
        sa.Column("card_accepted_flag", sa.Boolean),
        sa.Column("gift_coupon_sodexo_flag", sa.Boolean),
        sa.Column("door_delivery_flag", sa.Boolean),
        sa.Column("online_sales_flag", sa.Boolean),
        sa.Column("company_tieup_flag", sa.Boolean),
        sa.Column("b2b_purchase_flag", sa.Boolean),
        schema="warehouse",
    )

    # --- many-rows-per-outlet facts -----------------------------------------
    op.create_table(
        "fact_outlet_category",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("outlet_id", sa.Integer, sa.ForeignKey("warehouse.outlet.outlet_id"), nullable=False),
        sa.Column("category_id", sa.Integer, sa.ForeignKey("warehouse.dim_product_category.category_id"), nullable=False),
        sa.Column("available", sa.Boolean, nullable=False),
        sa.Column("sku_count", sa.Integer),
        sa.Column("product_type_text", sa.Text),
        sa.UniqueConstraint("outlet_id", "category_id", name="uq_outlet_category"),
        schema="warehouse",
    )
    op.create_index("ix_outlet_category_outlet_id", "fact_outlet_category", ["outlet_id"], schema="warehouse")
    op.create_index("ix_outlet_category_category_id", "fact_outlet_category", ["category_id"], schema="warehouse")

    op.create_table(
        "fact_outlet_brand",
        sa.Column("outlet_id", sa.Integer, sa.ForeignKey("warehouse.outlet.outlet_id"), primary_key=True),
        sa.Column("brand_id", sa.Integer, sa.ForeignKey("warehouse.dim_brand.brand_id"), primary_key=True),
        schema="warehouse",
    )

    # --- restricted PII ------------------------------------------------------
    op.create_table(
        "outlet_contact",
        sa.Column("outlet_id", sa.Integer, sa.ForeignKey("warehouse.outlet.outlet_id"), primary_key=True),
        sa.Column("owner_name", sa.String(255)),
        sa.Column("contact_person", sa.String(255)),
        sa.Column("contact_no", sa.String(20)),
        sa.Column("alternate_contact_no", sa.String(20)),
        sa.Column("key_person", sa.String(255)),
        sa.Column("key_person_phone_no", sa.String(20)),
        sa.Column("email_address", sa.String(255)),
        sa.Column("gst_no", sa.String(30)),
        schema="restricted",
    )

    # --- seed the 22 real product categories ---------------------------------
    category_table = sa.table(
        "dim_product_category",
        sa.column("category_name", sa.String),
        sa.column("display_order", sa.Integer),
        sa.column("has_sku_count", sa.Boolean),
        sa.column("has_product_type_text", sa.Boolean),
        sa.column("flag_only", sa.Boolean),
        schema="warehouse",
    )
    op.bulk_insert(
        category_table,
        [
            {
                "category_name": name,
                "display_order": order,
                "has_sku_count": has_sku,
                "has_product_type_text": has_type_text,
                "flag_only": flag_only,
            }
            for name, order, has_sku, has_type_text, flag_only in PRODUCT_CATEGORIES
        ],
    )


def downgrade() -> None:
    op.drop_table("outlet_contact", schema="restricted")
    op.drop_table("fact_outlet_brand", schema="warehouse")
    op.drop_table("fact_outlet_category", schema="warehouse")
    op.drop_table("fact_business", schema="warehouse")
    op.drop_table("fact_infrastructure", schema="warehouse")
    op.drop_table("outlet", schema="warehouse")
    op.drop_table("dim_brand", schema="warehouse")
    op.drop_table("dim_product_category", schema="warehouse")
    op.drop_table("dim_ownership", schema="warehouse")
    op.drop_table("dim_outlet_class", schema="warehouse")
    op.drop_table("dim_channel", schema="warehouse")
    op.drop_table("dim_outlet_type", schema="warehouse")
    op.drop_table("dim_geography", schema="warehouse")
    op.execute("DROP SCHEMA IF EXISTS restricted CASCADE")
    op.execute("DROP SCHEMA IF EXISTS warehouse CASCADE")
