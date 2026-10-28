"""Maps every raw district name actually found in the source data to its
official Karnataka district name (the 31 used by the frontend's GeoJSON map).

Built by inspecting `warehouse.dim_geography` after the real 103,631-row load:
field surveyors used a mix of pre-2014 names, renamed names, and typos, so the
raw column has 43 distinct values against 31 official districts.

`is_valid_karnataka=False` rows are genuine data-entry errors (outlets
attributed to Hyderabad, Visakhapatnam, etc.) — 9 rows total, excluded from
Karnataka-wide reporting rather than silently folded into some district.

Three official districts — Chikkaballapura, Raichur, Udupi — have NO matching
raw value at all, meaning zero outlets were surveyed there. That's a real
coverage gap, not a mapping bug; they're included here with no raw rows
pointing at them so the map correctly renders them at zero.
"""

DISTRICT_ALIASES: list[tuple[str, str, bool]] = [
    # (raw_district_name, official_district_name, is_valid_karnataka)
    ("Bangalore", "Bengaluru Urban", True),
    ("Bengaluru Urban", "Bengaluru Urban", True),
    ("Bangalore Rural", "Bengaluru Rural", True),
    ("Bengaluru Rural", "Bengaluru Rural", True),
    ("Mysore", "Mysuru", True),
    ("Mysuru", "Mysuru", True),
    ("Dharwad", "Dharwad", True),
    ("Hassan", "Hassan", True),
    ("Gulbarga", "Kalaburagi", True),
    ("Kalaburagi", "Kalaburagi", True),
    ("Shimoga", "Shivamogga", True),
    ("Belgaum", "Belagavi", True),
    ("Belagavi", "Belagavi", True),
    ("Davangere", "Davanagere", True),
    ("Davanagere", "Davanagere", True),
    ("Tumkur", "Tumakuru", True),
    ("Bijapur(KAR)", "Vijayapura", True),
    ("Mandya", "Mandya", True),
    ("Gadag", "Gadag", True),
    ("Bellary", "Ballari", True),
    ("Dakshina Kannada", "Dakshina Kannada", True),
    ("Koppal", "Koppal", True),
    ("Koppala", "Koppal", True),
    ("Haveri", "Haveri", True),
    ("Chitradurga", "Chitradurga", True),
    ("Ramanagar", "Ramanagara", True),
    ("Ramanagara", "Ramanagara", True),
    ("Vijayanagara", "Vijayanagara", True),
    ("Chickmagalur", "Chikkamagaluru", True),
    ("Bidar", "Bidar", True),
    ("Uttara Kannada", "Uttara Kannada", True),
    ("Chamrajnagar", "Chamarajanagar", True),
    ("Chamarajanagara", "Chamarajanagar", True),
    ("Kodagu", "Kodagu", True),
    ("Yadgir", "Yadgir", True),
    ("Yadagiri", "Yadgir", True),
    ("Kolar", "Kolar", True),
    ("Bagalkot", "Bagalkot", True),
    ("Unknown District", "Unknown District", True),
    # Genuine data-entry errors — real outlets, but not attributable to any
    # Karnataka district as recorded. Excluded from district-level rollups.
    ("Hyderabad", "Hyderabad", False),
    ("Visakhapatnam", "Visakhapatnam", False),
    ("K.V.Rangareddy", "K.V.Rangareddy", False),
    ("Bhagalpur", "Bhagalpur", False),
]

# Zero real outlets recorded under any spelling of these three — a genuine
# coverage gap, kept here as documentation (they need no alias row since
# nothing in the raw data points at them).
UNSURVEYED_OFFICIAL_DISTRICTS = ["Chikkaballapura", "Raichur", "Udupi"]

ALL_OFFICIAL_DISTRICTS = sorted({name for _, name, valid in DISTRICT_ALIASES if valid} | set(UNSURVEYED_OFFICIAL_DISTRICTS))
