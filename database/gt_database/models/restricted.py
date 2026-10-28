from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from gt_database.base import Base


class OutletContact(Base):
    """Personally-identifiable data, deliberately isolated in the `restricted`
    schema — separate from `warehouse`, which is what the dashboard/general API
    reads from. Nothing in this table should be joined into analytics queries.
    """

    __tablename__ = "outlet_contact"
    __table_args__ = {"schema": "restricted"}

    outlet_id: Mapped[int] = mapped_column(ForeignKey("warehouse.outlet.outlet_id"), primary_key=True)

    owner_name: Mapped[str | None] = mapped_column(String(255))
    contact_person: Mapped[str | None] = mapped_column(String(255))
    contact_no: Mapped[str | None] = mapped_column(String(20))
    alternate_contact_no: Mapped[str | None] = mapped_column(String(20))
    key_person: Mapped[str | None] = mapped_column(String(255))
    key_person_phone_no: Mapped[str | None] = mapped_column(String(20))
    email_address: Mapped[str | None] = mapped_column(String(255))
    gst_no: Mapped[str | None] = mapped_column(String(30), comment="Widened from 15/20 — some source rows have a 'GSTIN:' prefix stripped in cleaning, but keep headroom for other real-world variants")
