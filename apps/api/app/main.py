from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from gt_database.session import get_engine
from sqlalchemy import text

from app.core.config import settings
from app.routers import brands, categories, geography, infrastructure, opportunity, sales, segmentation

app = FastAPI(title="Karnataka GT Platform API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router_module in (geography, segmentation, infrastructure, categories, brands, sales, opportunity):
    app.include_router(router_module.router)


@app.get("/health")
def health() -> dict:
    """Confirms the API process is up AND can actually reach Postgres —
    a plain 200 with no DB check would hide a broken connection string.
    """
    with get_engine().connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "ok"}
