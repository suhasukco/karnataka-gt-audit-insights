"""Import every model module so `Base.metadata` is fully populated for Alembic
autogenerate and `Base.metadata.create_all()`.
"""

from gt_database.models.geography import DimGeography
from gt_database.models.district_alias import DimDistrictAlias
from gt_database.models.lookups import DimBrand, DimChannel, DimOutletClass, DimOutletType, DimOwnership, DimProductCategory
from gt_database.models.outlet import Outlet
from gt_database.models.facts import FactBusiness, FactInfrastructure, FactOutletBrand, FactOutletCategory
from gt_database.models.restricted import OutletContact

__all__ = [
    "DimGeography",
    "DimDistrictAlias",
    "DimOutletType",
    "DimChannel",
    "DimOutletClass",
    "DimOwnership",
    "DimProductCategory",
    "DimBrand",
    "Outlet",
    "FactInfrastructure",
    "FactBusiness",
    "FactOutletCategory",
    "FactOutletBrand",
    "OutletContact",
]
