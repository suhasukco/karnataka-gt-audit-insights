# CLAUDE.md — Karnataka General Trade 2026

Read this at the start of every session. There is **one** product in this repo:
the **data dashboard**. (An earlier scroll-driven "cinematic experience" was
built at `/` and then removed on 2026-08-18 at the client's request — see
"History" at the bottom. Don't rebuild it unless explicitly asked.)

---

## 1. What this is

**Karnataka GT Intelligence Platform 2026** — a live analytics dashboard over a
door-to-door field census of **1,03,622+ General Trade outlets across 29
districts / 168 taluks**. Purpose: turn retail expansion in Karnataka from a
guess into evidence.

Audience is commercial (sales/distribution/CEO), so the bar is: clear numbers,
honest labels, fast pages. It is a report you can interrogate — not an art piece.

## 2. Routes (all under `AppShell`)

| Route | Page | Notes |
|---|---|---|
| `/` | `pages/Home.tsx` | Home — branded intro → hero handoff animation, live stat strip, lens cards |
| `/dashboard` | — | Redirects to `/` (legacy link, kept working) |
| `/live/geography` | `LiveGeography` | Choropleth + top districts |
| `/live/infrastructure` | `LiveInfrastructure` | Infra & digital adoption |
| `/live/category-brand` | `LiveCategoryBrand` | Category depth & brand presence |
| `/live/sales-opportunity` | `LiveSalesOpportunity` | Sales + composite opportunity score |

Those four `/live/*` pages are **the four tabs** in the sidebar
(`components/layout/nav.ts` is the single source for nav items).

**All four tabs share the light theme.** A dark, neon "Geo Command Deck" was
built over `/live/geography` on 2026-08-21 and reverted the same day at the
client's request — the page is to look like Infrastructure & Digital and Sales
& Opportunity, not like its own product. The deck is kept, unwired, in
`.backup-geo-command-deck/` (and a later survey-styled iteration in
`.backup-geo-survey-wip/`). Don't reintroduce either unless asked.

## 3. Running it — BOTH halves are required

The dashboard is **not** static; every page reads the live API. Starting only
Vite gives you *"Couldn't reach the live API"* on every page.

```
# 1. Postgres must be listening on 5432 (db: karnataka_gt, see .env)
# 2. Backend
cd apps/api && ..\..\.venv\Scripts\uvicorn app.main:app --reload --port 8000
# 3. Frontend
cd apps/web && npm run dev            # http://localhost:5173
```

Check `http://localhost:8000/health` → `{"status":"ok"}` before debugging the UI.
Frontend points at `VITE_API_BASE_URL`, defaulting to `http://localhost:8000`
(`src/lib/liveApi.ts`).

## 4. Stack

React 19 · Vite 6 · Tailwind v4 · react-router-dom 7 · **Framer Motion**
(intro/reveal motion) · Recharts + Chart.js · d3-geo + topojson (Karnataka map) ·
Radix UI primitives · lucide-react.

Backend: FastAPI + SQLAlchemy on Postgres/PostGIS (`apps/api`), ETL in `etl/`.

**Removed on 2026-08-18** with the cinematic: `gsap`, `@gsap/react`, `lenis`,
`three`, `@react-three/{fiber,drei,postprocessing}`, `d3-delaunay`. Don't
reintroduce them casually — nothing in the dashboard needs 3D or smooth-scroll.

## 5. Design system

Light, professional, navy-and-blue. Tokens live in `apps/web/src/index.css`
(`@theme`): `--color-navy-*`, `--color-brand-*`, `--shadow-card*`, `--radius-card`.
Type is **Inter** (`--font-sans`, and `--font-serif` aliases to it) with **IBM
Plex Mono** (`--font-mono`) for eyebrows/labels and figures.

Motion is restrained: `lib/motion.ts` exports `fadeUpInView` / `fadeUpInViewDelay`
/ `EASE_OUT`. Respect `prefers-reduced-motion` (Home already does via
`useReducedMotion`).

## 6. Data

- Live figures come from the API — **do not hardcode them into components.**
- Static anchors + geometry ship in `apps/web/src/data/`: `report.json`/`report.ts`,
  `census.json`/`census.ts`, `districtBase.ts` (population/region/taluks),
  `karnataka-districts.json` (real district geometry), `constants.ts` (`SURVEY_META`).
- **Do not invent numbers.** If a figure isn't censused, label it honestly.

## 7. Known pre-existing breakage (not yours — don't be alarmed)

`npm run build` runs `tsc -b && vite build`, and **`tsc` currently fails** on:

- `components/charts/AreaChart.tsx` + `components/charts/ClusterMap.tsx` — orphan
  files imported by nothing, referencing packages that were never installed
  (`react-apexcharts`, `leaflet`, `@mui/material`). Safe to delete.
- `pages/Home.tsx` — a `LensCard` prop type error (`statValue` optional vs required).

`npx vite build` alone succeeds. Fix these if you touch that area; otherwise use
`npx vite build` to sanity-check a bundle.

## 8. Working method

- Confirm architecture/design in prose before writing implementation.
- "Make it look better" = visual polish only, no new features, unless stated.
- After a UI change: run **both** servers, **screenshot it and actually look**
  (Playwright is set up — see the `project_visual_testing` memory), check the
  console is clean, then stop and summarise.

## 9. History

- The repo also contains `.backup-before-*/` folders (plain copies, not git —
  **this repo is not a git repository**, so those backups are the only undo).
  `.backup-before-cinematic-removal/` holds the full deleted cinematic experience
  (`src/experience/`, 61 files) plus the pre-change `App.tsx`, `index.css` and
  `package.json`.
- Because there's no git, **back up before any destructive change.**
