# Local infrastructure

You're running Postgres locally already (not Docker), so the primary path is:

## 1. Create the database and enable PostGIS

```
psql -U postgres -h localhost
CREATE DATABASE karnataka_gt;
\c karnataka_gt
CREATE EXTENSION IF NOT EXISTS postgis;
```

(`CREATE EXTENSION` is also issued by the first Alembic migration, so this manual
step is just a sanity check that the `postgis` extension is actually installed
alongside your Postgres server — on Windows it ships with the Stack Builder
add-on, not the base installer.)

## 2. Point the project at it

Copy `.env.example` (repo root) to `.env` and fill in your real password:

```
DATABASE_URL=postgresql+psycopg2://postgres:YOUR_PASSWORD@localhost:5432/karnataka_gt
```

## 3. Run migrations

See `database/README.md`.

---

## Alternative: Docker (not needed on your current setup)

If you ever move off your local native Postgres — a teammate's machine, CI, etc. —
`docker-compose.yml` in this folder spins up Postgres 16 + PostGIS pre-installed:

```
docker compose -f infra/docker-compose.yml up -d
```

Not used in your current setup since Postgres is already running locally.
