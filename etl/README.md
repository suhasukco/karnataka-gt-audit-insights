# etl — extract, clean, load

Standalone Python pipeline that loads the real outlet export into Postgres.
Runs independently of the API — it's a script you invoke manually (or later,
on a schedule), not something the running app imports.

## Setup

From the repo root, with the shared venv active:

```
.venv\Scripts\pip install -r etl/requirements.txt
```

## Run

1. Drop the real export at `etl/data/raw/gt_outlets.xlsx` (or set `RAW_FILE_PATH`
   in your root `.env` to point elsewhere).
2. Make sure `alembic upgrade head` has been run (see `../database/README.md`) —
   the ETL loads into tables that migration creates, and expects the 22
   categories to already be seeded.
3. From the repo root:

```
.venv\Scripts\python -m etl.run_pipeline
```

## What it does, in order

1. **extract** — reads the Excel/CSV as-is (all text, zero transformation),
   validates the header row matches the expected 100 columns, writes it to
   `raw.outlets_raw`. This is your audit copy of exactly what was handed over.
2. **clean** — type-coerces flags to boolean, counts/SKUs to integer, validates
   lat/long against Karnataka's bounding box, normalizes phone numbers and GST
   numbers. Writes the typed result to `staging.outlets_clean`.
3. **load** — full refresh (truncate + reload) of every `warehouse` and
   `restricted` table: geography/lookup dimensions first (to get surrogate
   keys), then outlets, then the fact tables that depend on `outlet_id`.

Full refresh, not incremental upsert, because this is a one-time census, not
a recurring survey. If that changes later, `load.py` is where to add
`ON CONFLICT DO NOTHING` + re-select instead of truncate-first.

## Key files

- `columns.py` — the exact 100 source column headers; `extract.py` fails loudly
  if the real file's headers don't match, rather than silently loading garbage.
- `category_map.py` — per-category source column mapping. The 22 categories are
  **not** a uniform Flag+SKU shape (Egg has no SKU column, Personal Care/Branded
  Staple report free-text product type instead of a SKU number, OTC Products has
  no flag column at all) — this file is what lets the transform stay generic
  instead of branching on category name everywhere.
- `transform.py` — reshapes wide → long for categories and brands.
- `load.py` — the actual DB writes, in dependency order.

## Known follow-ups (not built yet, flagged rather than silently skipped)

- Brand-name cleaning is casing/whitespace normalization only — if the real
  `Brands Stocked` column turns out to have genuine typos/abbreviations, a
  fuzzy-matching pass (e.g. rapidfuzz) would sit between `build_brand_rows`
  and the `dim_brand` insert.
- `Sale Option` / `Purchase Option` are loaded as free text — once real sample
  values are visible, revisit whether they should become a Postgres ENUM or
  a proper lookup table.
