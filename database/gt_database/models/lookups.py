from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from gt_database.base import Base


class DimOutletType(Base):
    __tablename__ = "dim_outlet_type"
    __table_args__ = {"schema": "warehouse"}

    outlet_type_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    type_name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)


class DimChannel(Base):
    __tablename__ = "dim_channel"
    __table_args__ = {"schema": "warehouse"}

    channel_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    channel_name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)


class DimOutletClass(Base):
    __tablename__ = "dim_outlet_class"
    __table_args__ = {"schema": "warehouse"}

    outlet_class_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    class_name: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)


class DimOwnership(Base):
    __tablename__ = "dim_ownership"
    __table_args__ = {"schema": "warehouse"}

    ownership_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ownership_name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)


class DimProductCategory(Base):
    """The 22 tracked product categories (matches the frontend's CATEGORIES_TRACKED = 22).

    `has_sku_count` / `has_product_type_text` / `flag_only` describe how this
    particular category was captured in the source survey — the 22 flag/SKU column
    pairs are NOT uniform (e.g. Egg has no SKU column, Personal Care captures a
    free-text product type instead of a SKU number, OTC has no flag column). The
    ETL and any consumer should branch on these metadata columns instead of
    hardcoding category-name exceptions.
    """

    __tablename__ = "dim_product_category"
    __table_args__ = {"schema": "warehouse"}

    category_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    category_name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    has_sku_count: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    has_product_type_text: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    flag_only: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class DimBrand(Base):
    __tablename__ = "dim_brand"
    __table_args__ = {"schema": "warehouse"}

    brand_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    brand_name: Mapped[str] = mapped_column(String(150), nullable=False, unique=True)
    normalized_name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
