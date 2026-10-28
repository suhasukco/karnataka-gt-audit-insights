"""CLI entrypoint: extract -> clean -> load, end to end.

Usage (from etl/, with the shared venv active):
    python -m etl.run_pipeline
    RAW_FILE_PATH=/path/to/export.xlsx python -m etl.run_pipeline
"""

import logging
import time

from sqlalchemy import create_engine

from etl import clean, extract, load
from etl.config import DATABASE_URL, RAW_FILE_PATH

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)-8s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


def main() -> None:
    started = time.perf_counter()
    engine = create_engine(DATABASE_URL)

    logger.info("Extracting from %s", RAW_FILE_PATH)
    raw_df = extract.read_source_file(RAW_FILE_PATH)
    raw_df = extract.write_raw(engine, raw_df)

    logger.info("Cleaning %d rows", len(raw_df))
    clean_df = clean.clean_dataframe(raw_df)
    clean.write_staging(engine, clean_df)

    logger.info("Loading warehouse + restricted schemas")
    load.run_full_load(engine, clean_df)

    elapsed = time.perf_counter() - started
    logger.info("Pipeline complete in %.1fs", elapsed)


if __name__ == "__main__":
    main()
