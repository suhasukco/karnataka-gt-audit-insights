from datetime import datetime

from sqlalchemy import ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from gt_database.base import Base


class Outlet(Base):
    """The core/master outlet record — one row per surveyed outlet.

    This is a one-time census (not a recurring survey), so there is no
    survey-round dimension: this table IS the grain of every fact table below.
    Lat/long/address live here directly rather than in a "dim_location" table,
    since they are unique per outlet and a join would buy nothing.
    """

    __tablename__ = "outlet"
    __table_args__ = {"schema": "warehouse"}

    outlet_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    source_row_id: Mapped[int | None] = mapped_column(comment="Row number in raw.outlets_raw, for traceability")

    outlet_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    outlet_type_id: Mapped[int | None] = mapped_column(ForeignKey("warehouse.dim_outlet_type.outlet_type_id"))
    channel_id: Mapped[int | None] = mapped_column(ForeignKey("warehouse.dim_channel.channel_id"))
    outlet_class_id: Mapped[int | None] = mapped_column(ForeignKey("warehouse.dim_outlet_class.outlet_class_id"))
    ownership_id: Mapped[int | None] = mapped_column(ForeignKey("warehouse.dim_ownership.ownership_id"))
    outlet_age: Mapped[int | None]

    geography_id: Mapped[int] = mapped_column(ForeignKey("warehouse.dim_geography.geography_id"), nullable=False, index=True)
    street_address: Mapped[str | None] = mapped_column(Text)
    landmark: Mapped[str | None] = mapped_column(String(255))
    in_and_around: Mapped[str | None] = mapped_column(String(255))
    gps_location_raw: Mapped[str | None] = mapped_column(String(255), comment="Raw GPS Location text as captured by the field app")
    latitude: Mapped[float | None] = mapped_column(Numeric(9, 6))
    longitude: Mapped[float | None] = mapped_column(Numeric(9, 6))
    # No `geom` column: PostGIS isn't installed on this Postgres server yet (base
    # install only). Add it back here + via a follow-up migration once it is —
    # lat/long above are sufficient for everything the frontend does today.

    # Derived from latitude/longitude by gt_database.metro_data.classify — see
    # scripts/backfill_metro_flag.py. Stored rather than computed per query so
    # the four live pages can filter 103k rows on an index.
    metro_flag: Mapped[str | None] = mapped_column(
        String(10), index=True, comment="Metro / Non-Metro / Unknown, derived from latitude+longitude"
    )
    city_tier: Mapped[str | None] = mapped_column(
        String(24), index=True, comment="Tier 1/2/3, Beyond Tier-3 (Rural), or Unknown"
    )
    urban_rural: Mapped[str | None] = mapped_column(
        String(10), index=True, comment="Urban / Rural / Unknown"
    )

    employee_count: Mapped[int | None]
    sale_option: Mapped[str | None] = mapped_column(String(50), comment="Kept as free text pending real sample values; revisit as enum/lookup once known")
    purchase_option: Mapped[str | None] = mapped_column(String(50))
    outlet_related_remarks: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
