import json
from pathlib import Path

import pytest

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture(scope="session")
def photoprism_photos_export() -> list[dict]:
    path = FIXTURES_DIR / "photoprism_photos_v0_response.json"
    with path.open(encoding="utf-8") as f:
        data = json.load(f)
    assert isinstance(data, list)
    return data
