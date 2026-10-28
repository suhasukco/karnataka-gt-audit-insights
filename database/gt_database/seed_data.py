"""Static reference data seeded by the initial Alembic migration.

PRODUCT_CATEGORIES mirrors the 22 real categories found in the source survey
(after excluding "Cadbury Display", which is a brand merchandising flag rather
than a stocked category — it lives on fact_infrastructure instead). This also
matches the frontend's existing `CATEGORIES_TRACKED = 22` assumption, so no
frontend changes are needed once real data replaces the mock dataset.

has_sku_count / has_product_type_text / flag_only describe how each category
was actually captured in the 100-column source sheet:
  - Every category except Egg has a pipe-delimited sub-type list in the
    source (e.g. Rice = "Basmati|Branded|Regular") — despite some of those
    source columns being literally named "*_SKU", none of them are a numeric
    SKU count. `product_type_text` keeps the raw list; `sku_count` is derived
    by the ETL as the number of items selected in it. So has_sku_count and
    has_product_type_text are both True for every category except Egg.
  - Egg has a flag but no sub-type list at all in the source (flag_only).
  - OTC Products has a sub-type list but no dedicated flag column — the ETL
    derives availability as (sku_count > 0) for this one category.
"""

PRODUCT_CATEGORIES = [
    # (category_name, display_order, has_sku_count, has_product_type_text, flag_only)
    ("Branded Staple", 1, True, True, False),
    ("Atta Flour", 2, True, True, False),
    ("Dal Pulses", 3, True, True, False),
    ("Rice", 4, True, True, False),
    ("Dry Fruits", 5, True, True, False),
    ("Papad", 6, True, True, False),
    ("Fruit Juice", 7, True, True, False),
    ("Masala Mix", 8, True, True, False),
    ("Snacks", 9, True, True, False),
    ("Spreads & Sauces", 10, True, True, False),
    ("Beverages", 11, True, True, False),
    ("Egg", 12, False, False, True),
    ("Health Mix", 13, True, True, False),
    ("Stationery", 14, True, True, False),
    ("Personal Care", 15, True, True, False),
    ("Home Care", 16, True, True, False),
    ("Frozen Food", 17, True, True, False),
    ("Vegetables", 18, True, True, False),
    ("Pooja Category", 19, True, True, False),
    ("Ready to Cook", 20, True, True, False),
    ("Milk Products", 21, True, True, False),
    ("OTC Products", 22, True, True, False),
]
