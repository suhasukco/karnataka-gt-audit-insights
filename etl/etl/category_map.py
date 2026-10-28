"""Maps each of the 22 real product categories to its source columns.

Category names here must exactly match `gt_database.seed_data.PRODUCT_CATEGORIES`
(that's how fact rows get linked to the right `category_id`).

IMPORTANT: every "*_SKU" column in the source is NOT a numeric SKU count —
it's a pipe-delimited multi-select list of sub-types actually stocked, e.g.
Rice SKU = "Branded ( Packed)|Regular Rice ( loose )|Basmati". This is the
exact same shape as "Personal Care Product Type" / "Branded Staple Prod
Types", so there is no real Flag+SKU vs. Flag+ProductType distinction in this
data — there's one shape (`subtype_col`, a pipe list) used almost everywhere,
plus `sku_count` derived as *the number of pipe-delimited items selected*
(computed in transform.py), not a value read directly off the sheet.

flag_col=None means "derive availability from the sub-type list being
non-empty" (only true for OTC Products, which has no dedicated flag column).
Egg has neither a SKU nor a product-type column in the source at all.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class CategoryColumns:
    category_name: str
    flag_col: str | None
    subtype_col: str | None = None


CATEGORY_COLUMN_MAP: list[CategoryColumns] = [
    CategoryColumns("Branded Staple", "Branded Staple Category Flag", subtype_col="Branded Staple Prod Types"),
    CategoryColumns("Atta Flour", "Atta Flour Flag", subtype_col="Atta Flours SKU"),
    CategoryColumns("Dal Pulses", "Dal Pulses Flag", subtype_col="Dals Pulses SKU"),
    CategoryColumns("Rice", "Rice Flag", subtype_col="Rice SKU"),
    CategoryColumns("Dry Fruits", "Dry Fruits Flag", subtype_col="Dryfruits Nuts SKU"),
    CategoryColumns("Papad", "Papad Flag", subtype_col="Papad SKU"),
    CategoryColumns("Fruit Juice", "Fruit Juice Flag", subtype_col="Fruit Juice Drinks SKU"),
    CategoryColumns("Masala Mix", "Masala Mix Flag", subtype_col="Masal Mixes SKU"),
    CategoryColumns("Snacks", "Snacks Flag", subtype_col="Snacks SKU"),
    CategoryColumns("Spreads & Sauces", "Spreads Sauce Flag", subtype_col="Spreads Sauces SKU"),
    CategoryColumns("Beverages", "Beverage Flag", subtype_col="Beverages SKU"),
    CategoryColumns("Egg", "Egg Flag"),  # no sub-type list exists for this one in the source
    CategoryColumns("Health Mix", "Health Mix Flag", subtype_col="Health Mix SKU"),
    CategoryColumns("Stationery", "Stationery Flag", subtype_col="Stationery SKU"),
    CategoryColumns("Personal Care", "Personal Care Flag", subtype_col="Personal Care Product Type"),
    CategoryColumns("Home Care", "Home Care Flag", subtype_col="Home Care SKU"),
    CategoryColumns("Frozen Food", "Frozen Food Flag", subtype_col="Frozen Food SKU"),
    CategoryColumns("Vegetables", "Vegetable Flag", subtype_col="Vegetables SKU"),
    CategoryColumns("Pooja Category", "Pooja Category Flag", subtype_col="Pooja Category SKU"),
    CategoryColumns("Ready to Cook", "Ready to Cook Flag", subtype_col="Ready Cook SKU"),
    CategoryColumns("Milk Products", "Milk Products Flag", subtype_col="Milk Products SKU"),
    CategoryColumns("OTC Products", None, subtype_col="OTC Products SKU"),  # no flag column in source
]

# "Cadbury Display Flag" is deliberately excluded — it's a brand merchandising
# flag, not a stocked category, and is loaded into fact_infrastructure instead.
