"""Integration-shaped tests for PhotoprismAdapter using the obfuscated export fixture."""

from datetime import UTC, datetime

import pytest
import respx
from httpx import Response

from app.photo_source.base import Photo
from app.photo_source.photoprism import PhotoprismAdapter

_BASE_URL = "http://photoprism.local:2342"


def _photo_from_photoprism_record(record: dict) -> Photo:
    """Expected mapping from a Photoprism /api/v1/photos record to our Photo type."""
    taken_at = datetime.fromisoformat(record["TakenAt"].replace("Z", "+00:00")).astimezone(UTC)
    return Photo(id=record["UID"], taken_at=taken_at, folder=record["Path"])


@pytest.mark.xfail(
    reason="PhotoprismAdapter.list_photos is not implemented yet",
    strict=False,
)
@pytest.mark.asyncio
async def test_list_photos(photoprism_photos_export: list[dict]):
    adapter = PhotoprismAdapter(base_url=_BASE_URL, token="test-token")
    export = photoprism_photos_export

    with respx.mock:
        respx.get(f"{_BASE_URL}/api/v1/photos").mock(
            return_value=Response(200, json=export),
        )
        photos = await adapter.list_photos()

    assert len(photos) == len(export)
    assert photos[0] == _photo_from_photoprism_record(export[0])
    assert photos[-1] == _photo_from_photoprism_record(export[-1])
