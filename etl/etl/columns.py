"""The exact 100 source column headers, as given in the GT report export.

Used by `extract.py` to fail loudly if the actual file's headers have drifted
(renamed/reordered/added columns) rather than silently loading garbage.
"""

RAW_COLUMNS: list[str] = [
    "Outlet Name", "Outlet Type", "Channel", "Outlet Class", "Outlet Ownership Type", "Outlet Age",
    "Street Address", "Landmark", "In and Around", "GPS Location", "Latitude", "Longitude",
    "City", "Taluka", "District", "State", "Pin Code",
    "Owner Name", "Contact Person", "Contact No", "Alternate Contact No", "Key Person",
    "Key Person Phone No", "Email Address", "GST No",
    "Shutters Count", "Name Board", "Fridge Flag", "Fridge Count", "Cooler Flag", "Cooler Count",
    "Deep Freezer Flag", "Deep Freezer Count", "Display Rack Flag", "Display Rack Count",
    "Chips Stand Flag", "Hanger Flag", "Cash Counter Display", "Cash Counter Count",
    "Poster Dangler Flag", "Promoter Flag", "Sampling Area Flag", "AC Flag",
    "Employee Count", "Sales Monthly Avg", "Billing Software Flag", "Digital Payment Accepted",
    "Card Accepted", "Gift Coupon Sodexo Flag", "Door Delivery Flag", "Online Sales Flag",
    "Company Tieup Flag", "B2B Purchase Flag", "Sale Option", "Purchase Option", "Outlet Related Remarks",
    "Branded Staple Category Flag", "Branded Staple Prod Types",
    "Atta Flour Flag", "Atta Flours SKU", "Dal Pulses Flag", "Dals Pulses SKU",
    "Rice Flag", "Rice SKU", "Dry Fruits Flag", "Dryfruits Nuts SKU",
    "Papad Flag", "Papad SKU", "Fruit Juice Flag", "Fruit Juice Drinks SKU",
    "Masala Mix Flag", "Masal Mixes SKU", "Snacks Flag", "Snacks SKU",
    "Spreads Sauce Flag", "Spreads Sauces SKU", "Beverage Flag", "Beverages SKU",
    "Egg Flag", "Health Mix Flag", "Health Mix SKU", "Stationery Flag", "Stationery SKU",
    "Personal Care Flag", "Personal Care Product Type", "Home Care Flag", "Home Care SKU",
    "Frozen Food Flag", "Frozen Food SKU", "Cadbury Display Flag",
    "Vegetable Flag", "Vegetables SKU", "Pooja Category Flag", "Pooja Category SKU",
    "Ready to Cook Flag", "Ready Cook SKU", "Milk Products Flag", "Milk Products SKU",
    "OTC Products SKU", "Brands Stocked",
]

assert len(RAW_COLUMNS) == 100, f"Expected 100 columns, got {len(RAW_COLUMNS)}"
