"""Integration-shaped tests for PhotoprismAdapter using the obfuscated export fixture."""

from datetime import UTC, datetime

import pytest
import respx
from httpx import Request, Response

from app.photo_source.base import Photo
from app.photo_source.photoprism import (
    PhotoprismAdapter,
    _PAGE_SIZE,
    _list_photos_params,
    _parse_pagination_headers,
    _photo_from_record,
)

_BASE_URL = "http://photoprism.local:2342"


def _photo_from_photoprism_record(record: dict) -> Photo:
    """Expected mapping from a Photoprism /api/v1/photos record to our Photo type."""
    taken_at = datetime.fromisoformat(record["TakenAt"].replace("Z", "+00:00")).astimezone(UTC)
    return Photo(id=record["UID"], taken_at=taken_at, folder=record["Path"])


def _assert_list_photos_params(request: Request, expected_offset: int) -> None:
    assert request.url.params.get("count") == str(_PAGE_SIZE)
    assert request.url.params.get("primary") == "true"
    assert request.url.params.get("offset") == str(expected_offset)


def _paginated_photos_response(
    request: Request,
    export: list[dict],
    *,
    expected_offsets: list[int],
) -> Response:
    offset = int(request.url.params.get("offset", "0"))
    assert offset in expected_offsets
    _assert_list_photos_params(request, offset)

    count = int(request.url.params.get("count", str(_PAGE_SIZE)))
    batch = export[offset : offset + count]
    return Response(
        200,
        json=batch,
        headers={"X-Count": str(len(batch)), "X-Limit": str(count)},
    )


@pytest.mark.asyncio
async def test_list_photos(photoprism_photos_export: list[dict]):
    adapter = PhotoprismAdapter(base_url=_BASE_URL, token="test-token")
    export = photoprism_photos_export
    expected_offsets: list[int] = []

    def side_effect(request: Request) -> Response:
        offset = int(request.url.params.get("offset", "0"))
        if offset not in expected_offsets:
            expected_offsets.append(offset)
        return _paginated_photos_response(request, export, expected_offsets=expected_offsets)

    with respx.mock:
        respx.get(f"{_BASE_URL}/api/v1/photos").mock(side_effect=side_effect)
        photos = await adapter.list_photos()

    await adapter.aclose()

    assert len(photos) == len(export)
    assert photos[0] == _photo_from_photoprism_record(export[0])
    assert photos[-1] == _photo_from_photoprism_record(export[-1])
    assert expected_offsets == list(range(0, len(export), _PAGE_SIZE))


@pytest.mark.asyncio
async def test_list_photos_two_pages(photoprism_photos_export: list[dict]):
    adapter = PhotoprismAdapter(base_url=_BASE_URL, token="test-token")
    export = photoprism_photos_export[:1500]
    expected_offsets: list[int] = []

    def side_effect(request: Request) -> Response:
        offset = int(request.url.params.get("offset", "0"))
        if offset not in expected_offsets:
            expected_offsets.append(offset)
        return _paginated_photos_response(request, export, expected_offsets=expected_offsets)

    with respx.mock:
        respx.get(f"{_BASE_URL}/api/v1/photos").mock(side_effect=side_effect)
        photos = await adapter.list_photos()

    await adapter.aclose()

    assert len(photos) == 1500
    assert expected_offsets == [0, 1000]


def test_photo_from_record_missing_keys():
    with pytest.raises(ValueError, match="missing required keys"):
        _photo_from_record({"UID": "x", "TakenAt": "2024-01-01T00:00:00Z"})


def test_parse_pagination_headers_rejects_count_above_limit():
    with pytest.raises(ValueError, match="exceeds X-Limit"):
        _parse_pagination_headers("1001", "1000")


def test_list_photos_params():
    assert _list_photos_params(2000) == {"count": 1000, "offset": 2000, "primary": "true"}
