"""Extract: load the raw Excel/CSV export as-is into the `raw` schema.

Zero transformation happens here on purpose — this is the untouched audit
copy of what the field team handed over. Every column is loaded as text.
If a load ever produces wrong numbers downstream, this table is the first
place to check whether the *source* data was already wrong.
"""

import logging
from pathlib import Path

import pandas as pd
from sqlalchemy import text
from sqlalchemy.engine import Engine

from etl.columns import RAW_COLUMNS

logger = logging.getLogger(__name__)

RAW_SCHEMA = "raw"
RAW_TABLE = "outlets_raw"


def read_source_file(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(
            f"Raw source file not found at {path}. Set RAW_FILE_PATH in etl/.env "
            "or drop the export at etl/data/raw/gt_outlets.xlsx."
        )

    if path.suffix.lower() in (".xlsx", ".xls"):
        df = pd.read_excel(path, dtype=str)
    elif path.suffix.lower() == ".csv":
        df = pd.read_csv(path, dtype=str)
    else:
        raise ValueError(f"Unsupported file type: {path.suffix}. Use .xlsx or .csv.")

    validate_headers(df)
    return df


def validate_headers(df: pd.DataFrame) -> None:
    actual = list(df.columns)
    missing = [c for c in RAW_COLUMNS if c not in actual]
    extra = [c for c in actual if c not in RAW_COLUMNS]

    if missing:
        raise ValueError(f"Source file is missing {len(missing)} expected column(s): {missing}")
    if extra:
        logger.warning("Source file has %d unexpected extra column(s), ignoring: %s", len(extra), extra)


def write_raw(engine: Engine, df: pd.DataFrame) -> pd.DataFrame:
    """Writes the untouched DataFrame to raw.outlets_raw, replacing any previous load.

    Adds a `source_row_id` (1-indexed row position in the source file) so every
    downstream table can trace a value back to exactly which row it came from.
    """
    df = df[RAW_COLUMNS].copy()
    df.insert(0, "source_row_id", range(1, len(df) + 1))

    with engine.begin() as conn:
        conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {RAW_SCHEMA}"))

    df.to_sql(RAW_TABLE, engine, schema=RAW_SCHEMA, if_exists="replace", index=False, chunksize=5000)
    logger.info("Loaded %d rows into %s.%s", len(df), RAW_SCHEMA, RAW_TABLE)
    return df
