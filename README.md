# Karnataka General Trade Intelligence Platform

Monorepo for the Karnataka GT census platform: a real 103,000+ outlet dataset
warehoused in Postgres/PostGIS, served by a FastAPI backend, feeding a React
dashboard.

## Layout

```
apps/
  web/        React + Vite + TypeScript dashboard (the existing frontend)
  api/        FastAPI backend — serves the warehouse to the dashboard
etl/          Python pipeline: extract → clean → load the real outlet export
database/     Shared SQLAlchemy models + Alembic migrations (gt_database package)
infra/        Local Postgres setup notes (+ optional docker-compose)
docs/         Data dictionary, architecture notes
```

Each piece runs and deploys independently. `apps/api` and `etl/` both depend
on the `database` package as their single source of truth for what the schema
looks like — neither defines its own models.

## First-time setup

1. **Database** — see `infra/README.md` to create the `karnataka_gt` database
   and enable PostGIS on your local Postgres.
2. **Python environment** (one venv for `database` + `etl` + `apps/api`):
   ```
   python -m venv .venv
   .venv\Scripts\pip install -e ./database -r etl/requirements.txt -r apps/api/requirements.txt
   ```
3. **Environment variables** — copy `.env.example` → `.env` at the repo root,
   fill in your real Postgres password.
4. **Run migrations**:
   ```
   cd database
   ..\.venv\Scripts\alembic upgrade head
   ```
5. **Load real data** — drop the outlet export at `etl/data/raw/gt_outlets.xlsx`,
   then from the repo root:
   ```
   .venv\Scripts\python -m etl.run_pipeline
   ```
6. **Run the API**:
   ```
   cd apps/api
   ..\..\.venv\Scripts\uvicorn app.main:app --reload --port 8000
   ```
7. **Run the frontend** (unchanged):
   ```
   cd apps/web
   npm install
   npm run dev
   ```

## Why it's structured this way

- **One-time census, not recurring** — `outlet_id` is the grain of every fact
  table; no survey-round dimension. (Revisit if this ever becomes an annual
  re-survey — see `docs/data-dictionary.md`.)
- **PII isolated** — `restricted.outlet_contact` is a separate schema the
  dashboard/general API never touches, since this data is being submitted to
  the central government.
- **`raw` → `staging` → `warehouse`** — three Postgres schemas, not three
  databases (unnecessary at ~100k rows). `raw`/`staging` are ETL-owned and
  disposable; `warehouse`/`restricted` are the stable, Alembic-managed contract
  everything else depends on.
- **No `dim_location` table** — lat/long/address are unique per outlet, so
  that "dimension" would just be a mandatory join with zero dedup benefit.
  Only the state/district/taluk/city/pincode hierarchy genuinely repeats.

See `docs/data-dictionary.md` for the full column-by-column mapping from the
source export to this schema.
