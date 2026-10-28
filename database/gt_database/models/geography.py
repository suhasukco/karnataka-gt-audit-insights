from sqlalchemy import String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from gt_database.base import Base


class DimGeography(Base):
    """Administrative hierarchy (State -> District -> Taluk -> City -> Pincode).

    Deliberately does NOT hold lat/long or street address — those are unique per
    outlet and belong on `Outlet` itself. This table only exists because the
    administrative hierarchy genuinely repeats across ~100k outlet rows (a few
    thousand distinct combinations at most), which is what makes it worth a join.
    """

    __tablename__ = "dim_geography"
    __table_args__ = (
        UniqueConstraint("state", "district", "taluk", "city", "pincode", name="uq_geography_combo"),
        {"schema": "warehouse"},
    )

    geography_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    district: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    taluk: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    city: Mapped[str | None] = mapped_column(String(150), index=True)
    pincode: Mapped[str | None] = mapped_column(String(10), index=True)
