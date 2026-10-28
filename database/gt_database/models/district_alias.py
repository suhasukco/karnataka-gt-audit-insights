from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from gt_database.base import Base


class DimDistrictAlias(Base):
    """Reconciles the 43 raw district-name spellings actually found in the
    source data to the 31 official Karnataka district names the frontend's
    GeoJSON map is keyed on. See `gt_database.district_alias_data` for the
    full mapping and how it was derived.
    """

    __tablename__ = "dim_district_alias"
    __table_args__ = {"schema": "warehouse"}

    raw_district_name: Mapped[str] = mapped_column(String(100), primary_key=True)
    official_district_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    is_valid_karnataka: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
