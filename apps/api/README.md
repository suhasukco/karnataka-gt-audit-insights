# apps/api — FastAPI service

Deliberately minimal right now — a `/health` check that proves the API can
actually reach Postgres (not just that the process started), plus one example
router (`GET /api/districts/summary`) showing the pattern. The full analytics
API surface (matching every frontend page's data needs) is a later task, once
real data is loaded via `etl/`.

## Setup

```
.venv\Scripts\pip install -r apps/api/requirements.txt
```

## Run

From `apps/api/`:

```
..\..\.venv\Scripts\uvicorn app.main:app --reload --port 8000
```

Then check `http://localhost:8000/health` and `http://localhost:8000/docs`
(FastAPI's auto-generated Swagger UI).
