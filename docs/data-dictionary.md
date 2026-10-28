# Data dictionary — source 100 columns → warehouse schema

Maps every column in the real GT report export to where it ends up. If a
number in the dashboard ever looks wrong, this is the first place to trace it
back through.

## Identity / core → `warehouse.outlet`

| Source column | Destination |
|---|---|
| Outlet Name | `outlet.outlet_name` |
| Outlet Type | `dim_outlet_type.type_name` → `outlet.outlet_type_id` |
| Channel | `dim_channel.channel_name` → `outlet.channel_id` |
| Outlet Class | `dim_outlet_class.class_name` → `outlet.outlet_class_id` |
| Outlet Ownership Type | `dim_ownership.ownership_name` → `outlet.ownership_id` |
| Outlet Age | `outlet.outlet_age` |
| Sale Option | `outlet.sale_option` (free text for now — see Open Questions) |
| Purchase Option | `outlet.purchase_option` (free text for now — see Open Questions) |
| Outlet Related Remarks | `outlet.outlet_related_remarks` |

## Geography → `warehouse.dim_geography` + `outlet`

| Source column | Destination |
|---|---|
| State | `dim_geography.state` |
| District | `dim_geography.district` |
| Taluka | `dim_geography.taluk` |
| City | `dim_geography.city` |
| Pin Code | `dim_geography.pincode` |
| Street Address | `outlet.street_address` |
| Landmark | `outlet.landmark` |
| In and Around | `outlet.in_and_around` |
| GPS Location | `outlet.gps_location_raw` (kept as raw text audit copy) |
| Latitude / Longitude | `outlet.latitude` / `outlet.longitude`, plus `outlet.geom` (PostGIS point, derived) |

Deliberately **not** a `dim_location` table — lat/long/address are unique per
outlet, so normalizing them would add a mandatory join for zero dedup benefit.
Only the administrative hierarchy (state/district/taluk/city/pincode) repeats
enough to be worth its own table.

## PII → `restricted.outlet_contact` (isolated, not in the analytics warehouse)

| Source column | Destination |
|---|---|
| Owner Name | `outlet_contact.owner_name` |
| Contact Person | `outlet_contact.contact_person` |
| Contact No | `outlet_contact.contact_no` |
| Alternate Contact No | `outlet_contact.alternate_contact_no` |
| Key Person | `outlet_contact.key_person` |
| Key Person Phone No | `outlet_contact.key_person_phone_no` |
| Email Address | `outlet_contact.email_address` |
| GST No | `outlet_contact.gst_no` |

## Infrastructure → `warehouse.fact_infrastructure` (1:1 with outlet)

Shutters Count, Name Board, Fridge Flag/Count, Cooler Flag/Count, Deep Freezer
Flag/Count, Display Rack Flag/Count, Chips Stand Flag, Hanger Flag, Cash
Counter Display/Count, Poster Dangler Flag, Promoter Flag, Sampling Area Flag,
AC Flag, **Cadbury Display Flag** (a brand merchandising flag, not a stocked
category — lives here rather than in the category facts).

## Business / commerce → `warehouse.fact_business` (1:1 with outlet)

Employee Count *(→ `outlet.employee_count`, not this table)*, Sales Monthly
Avg, Billing Software Flag, Digital Payment Accepted, Card Accepted, Gift
Coupon Sodexo Flag, Door Delivery Flag, Online Sales Flag, Company Tieup Flag,
B2B Purchase Flag.

## Product categories → `warehouse.fact_outlet_category` (long/narrow, one row per outlet × category)

22 real categories after excluding "Branded Staple" is actually **included**
as its own category and "Cadbury Display" is **excluded** (brand flag, not a
category) — see `etl/etl/category_map.py` for the authoritative mapping. The
source's 45 flag/SKU/product-type columns are **not uniform**:

| Category | Flag column | SKU column | Product-type column | Note |
|---|---|---|---|---|
| Branded Staple | Branded Staple Category Flag | — | Branded Staple Prod Types | free text, not a count |
| Atta Flour | Atta Flour Flag | Atta Flours SKU | — | |
| Dal Pulses | Dal Pulses Flag | Dals Pulses SKU | — | |
| Rice | Rice Flag | Rice SKU | — | |
| Dry Fruits | Dry Fruits Flag | Dryfruits Nuts SKU | — | |
| Papad | Papad Flag | Papad SKU | — | |
| Fruit Juice | Fruit Juice Flag | Fruit Juice Drinks SKU | — | |
| Masala Mix | Masala Mix Flag | Masal Mixes SKU | — | |
| Snacks | Snacks Flag | Snacks SKU | — | |
| Spreads & Sauces | Spreads Sauce Flag | Spreads Sauces SKU | — | |
| Beverages | Beverage Flag | Beverages SKU | — | |
| Egg | Egg Flag | — | — | flag only, no SKU column exists |
| Health Mix | Health Mix Flag | Health Mix SKU | — | |
| Stationery | Stationery Flag | Stationery SKU | — | |
| Personal Care | Personal Care Flag | — | Personal Care Product Type | free text, not a count |
| Home Care | Home Care Flag | Home Care SKU | — | |
| Frozen Food | Frozen Food Flag | Frozen Food SKU | — | |
| Vegetables | Vegetable Flag | Vegetables SKU | — | |
| Pooja Category | Pooja Category Flag | Pooja Category SKU | — | |
| Ready to Cook | Ready to Cook Flag | Ready Cook SKU | — | |
| Milk Products | Milk Products Flag | Milk Products SKU | — | |
| OTC Products | — | OTC Products SKU | — | no flag column — availability derived as `sku_count > 0` |

This exactly matches the frontend's existing `CATEGORIES_TRACKED = 22`
assumption, so no frontend redesign is needed once real data replaces the mock
dataset.

## Brands → `warehouse.dim_brand` + `fact_outlet_brand`

`Brands Stocked` (free text, e.g. "Amul, Britannia, Parle") is split on
commas/semicolons/slashes/"and"/"&", normalized (trimmed, title-cased), and
deduplicated per outlet. Casing/whitespace duplicates are collapsed via a
`normalized_name` key; genuine typo-level fuzziness is a flagged follow-up,
not yet built (see `etl/README.md`).

## Open questions

- **Sale Option / Purchase Option** — loaded as free text pending real sample
  values. Revisit as a Postgres ENUM or lookup table once we can see what
  values actually appear.
- **Brand name cleanliness** — depends entirely on how consistently field
  surveyors typed brand names; a fuzzy-matching pass may be needed after
  seeing the real column.
