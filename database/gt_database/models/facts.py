from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from gt_database.base import Base


class FactInfrastructure(Base):
    """One row per outlet — the physical fixtures/infrastructure observed on survey."""

    __tablename__ = "fact_infrastructure"
    __table_args__ = {"schema": "warehouse"}

    outlet_id: Mapped[int] = mapped_column(ForeignKey("warehouse.outlet.outlet_id"), primary_key=True)

    shutters_count: Mapped[int | None]
    name_board_flag: Mapped[bool | None] = mapped_column(Boolean)

    fridge_flag: Mapped[bool | None] = mapped_column(Boolean)
    fridge_count: Mapped[int | None]
    cooler_flag: Mapped[bool | None] = mapped_column(Boolean)
    cooler_count: Mapped[int | None]
    deep_freezer_flag: Mapped[bool | None] = mapped_column(Boolean)
    deep_freezer_count: Mapped[int | None]
    display_rack_flag: Mapped[bool | None] = mapped_column(Boolean)
    display_rack_count: Mapped[int | None]

    chips_stand_flag: Mapped[bool | None] = mapped_column(Boolean)
    hanger_flag: Mapped[bool | None] = mapped_column(Boolean)
    cash_counter_display_flag: Mapped[bool | None] = mapped_column(Boolean)
    cash_counter_count: Mapped[int | None]
    poster_dangler_flag: Mapped[bool | None] = mapped_column(Boolean)
    promoter_flag: Mapped[bool | None] = mapped_column(Boolean)
    sampling_area_flag: Mapped[bool | None] = mapped_column(Boolean)
    ac_flag: Mapped[bool | None] = mapped_column(Boolean)

    cadbury_display_flag: Mapped[bool | None] = mapped_column(Boolean, comment="Brand merchandising flag, not a stocked category")


class FactBusiness(Base):
    """One row per outlet — commerce/business behaviour observed on survey."""

    __tablename__ = "fact_business"
    __table_args__ = {"schema": "warehouse"}

    outlet_id: Mapped[int] = mapped_column(ForeignKey("warehouse.outlet.outlet_id"), primary_key=True)

    sales_monthly_avg: Mapped[float | None] = mapped_column(Numeric(14, 2))
    billing_software_flag: Mapped[bool | None] = mapped_column(Boolean)
    digital_payment_flag: Mapped[bool | None] = mapped_column(Boolean)
    card_accepted_flag: Mapped[bool | None] = mapped_column(Boolean)
    gift_coupon_sodexo_flag: Mapped[bool | None] = mapped_column(Boolean)
    door_delivery_flag: Mapped[bool | None] = mapped_column(Boolean)
    online_sales_flag: Mapped[bool | None] = mapped_column(Boolean)
    company_tieup_flag: Mapped[bool | None] = mapped_column(Boolean)
    b2b_purchase_flag: Mapped[bool | None] = mapped_column(Boolean)


class FactOutletCategory(Base):
    """Long/narrow unpivot of the 22 category flag+SKU column pairs — one row per
    (outlet, category) that was present in the source. This is what makes the
    Category Intelligence dashboard's availability%/SKU-depth queries a simple
    GROUP BY instead of 45 hardcoded columns.
    """

    __tablename__ = "fact_outlet_category"
    __table_args__ = (
        UniqueConstraint("outlet_id", "category_id", name="uq_outlet_category"),
        {"schema": "warehouse"},
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    outlet_id: Mapped[int] = mapped_column(ForeignKey("warehouse.outlet.outlet_id"), nullable=False, index=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("warehouse.dim_product_category.category_id"), nullable=False, index=True)
    available: Mapped[bool] = mapped_column(Boolean, nullable=False)
    sku_count: Mapped[int | None] = mapped_column(Integer)
    product_type_text: Mapped[str | None] = mapped_column(Text, comment="Free-text product type for categories like Personal Care / Branded Staple that don't report a numeric SKU count")


class FactOutletBrand(Base):
    """Cleaned, split-out version of the free-text `Brands Stocked` column."""

    __tablename__ = "fact_outlet_brand"
    __table_args__ = {"schema": "warehouse"}

    outlet_id: Mapped[int] = mapped_column(ForeignKey("warehouse.outlet.outlet_id"), primary_key=True)
    brand_id: Mapped[int] = mapped_column(ForeignKey("warehouse.dim_brand.brand_id"), primary_key=True)
