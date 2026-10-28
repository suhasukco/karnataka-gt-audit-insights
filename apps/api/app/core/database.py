from collections.abc import Generator
from decimal import Decimal

from gt_database.session import SessionLocal
from sqlalchemy import text
from sqlalchemy.orm import Session


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency — one session per request, always closed after."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _jsonify(value):
    """Postgres NUMERIC columns come back from psycopg2 as decimal.Decimal.
    FastAPI's default encoder serializes Decimal as a JSON *string* (to avoid
    silent precision loss), which breaks every frontend call site expecting a
    plain number. Converting to float here, once, is safer than patching every
    `Number(...)` call on the frontend.
    """
    return float(value) if isinstance(value, Decimal) else value


def fetch_all(db: Session, sql: str, params: dict | None = None) -> list[dict]:
    """Runs a raw analytics query and returns plain dicts — these routers are
    aggregation-heavy enough that hand-written SQL reads more clearly than the
    equivalent ORM query, and returning dicts directly keeps response shaping
    trivial on the router side.
    """
    result = db.execute(text(sql), params or {})
    return [{k: _jsonify(v) for k, v in row.items()} for row in result.mappings().all()]


def fetch_one(db: Session, sql: str, params: dict | None = None) -> dict | None:
    rows = fetch_all(db, sql, params)
    return rows[0] if rows else None
