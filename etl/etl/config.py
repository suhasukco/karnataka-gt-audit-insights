import os
from pathlib import Path

from dotenv import load_dotenv
from gt_database.session import database_url

load_dotenv()

# Point this at wherever the real 100-column Excel/CSV export lives. Defaults to
# a `data/raw/` folder inside the etl/ project so it never gets committed
# (see .gitignore) but is easy to find.
RAW_FILE_PATH = Path(os.environ.get("RAW_FILE_PATH", Path(__file__).resolve().parent.parent / "data" / "raw" / "gt_outlets.xlsx"))

DATABASE_URL = database_url()

# Karnataka's approximate bounding box, used to sanity-check surveyed lat/long
# and null out anything that clearly wasn't captured correctly.
KARNATAKA_LAT_RANGE = (11.5, 18.5)
KARNATAKA_LNG_RANGE = (74.0, 78.5)

# The state is fixed for this dataset — every outlet is in Karnataka.
DEFAULT_STATE = "Karnataka"
