import os
from functools import lru_cache

from dotenv import load_dotenv
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

load_dotenv()

DEFAULT_DATABASE_URL = "postgresql+psycopg2://postgres:postgres@localhost:5432/karnataka_gt"


def database_url() -> str:
    return os.environ.get("DATABASE_URL", DEFAULT_DATABASE_URL)


@lru_cache
def get_engine() -> Engine:
    return create_engine(database_url(), pool_pre_ping=True, future=True)


SessionLocal = sessionmaker(bind=get_engine(), autoflush=False, autocommit=False, future=True)


def get_session() -> Session:
    """FastAPI/ETL dependency-friendly session factory. Caller is responsible for closing."""
    return SessionLocal()
