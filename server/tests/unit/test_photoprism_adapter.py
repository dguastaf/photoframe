"""Unit tests for PhotoprismAdapter — respx mocks upstream; no Photoframe server."""

from __future__ import annotations

from collections import Counter

import httpx
import pytest
import respx

from app.photo_source.photoprism import (
    PhotoprismAdapter,
    _PAGE_SIZE,
    _list_photos_params,
    _parse_pagination_headers,
    _photo_from_record,
)
from support.photoprism import (
    MOCK_JPEG_BYTES,
    RESPX_PHOTOPRISM_BASE_URL,
    make_respx_side_effect,
    photo_from_export_record,
)


# --- Pure helpers -------------------------------------------------------------


def test_photo_from_record_missing_keys():
    with pytest.raises(ValueError, match="missing required keys"):
        _photo_from_record({"UID": "x", "TakenAt": "2024-01-01T00:00:00Z"})


def test_parse_pagination_headers_rejects_count_above_limit():
    with pytest.raises(ValueError, match="exceeds X-Limit"):
        _parse_pagination_headers("1001", "1000")


def test_parse_pagination_headers_rejects_invalid_integers():
    with pytest.raises(ValueError, match="Invalid Photoprism pagination headers"):
        _parse_pagination_headers("nope", "1000")


def test_parse_pagination_headers_rejects_negative_count():
    with pytest.raises(ValueError, match="Negative Photoprism pagination headers"):
        _parse_pagination_headers("-1", "1000")


def test_list_photos_params():
    assert _list_photos_params(2000) == {"count": 1000, "offset": 2000, "primary": "true"}


def test_photo_from_record_maps_fields():
    photo = _photo_from_record(
        {
            "UID": "abc",
            "TakenAt": "2024-06-01T12:00:00Z",
            "Path": "vacation/2024",
        }
    )
    assert photo.id == "abc"
    assert photo.folder == "vacation/2024"
    assert photo.taken_at.year == 2024


# --- Adapter HTTP (respx) -----------------------------------------------------


@pytest.mark.asyncio
async def test_list_photos_full_export(photoprism_photos_export: list[dict]):
    adapter = PhotoprismAdapter(base_url=RESPX_PHOTOPRISM_BASE_URL, token="test-token")
    requested_offsets: list[int] = []
    try:
        with respx.mock:
            respx.get(f"{RESPX_PHOTOPRISM_BASE_URL}/api/v1/photos").mock(
                side_effect=make_respx_side_effect(
                    photoprism_photos_export, requested_offsets
                )
            )
            photos = await adapter.list_photos()
    finally:
        await adapter.aclose()

    assert len(photos) == len(photoprism_photos_export)
    assert photos[0] == photo_from_export_record(photoprism_photos_export[0])
    assert photos[-1] == photo_from_export_record(photoprism_photos_export[-1])
    assert requested_offsets == list(range(0, len(photoprism_photos_export), _PAGE_SIZE))


@pytest.mark.asyncio
async def test_list_photos_ids_match_export(photoprism_photos_export: list[dict]):
    adapter = PhotoprismAdapter(base_url=RESPX_PHOTOPRISM_BASE_URL, token="test-token")
    try:
        with respx.mock:
            respx.get(f"{RESPX_PHOTOPRISM_BASE_URL}/api/v1/photos").mock(
                side_effect=make_respx_side_effect(photoprism_photos_export, [])
            )
            photos = await adapter.list_photos()
    finally:
        await adapter.aclose()

    export_ids = [record["UID"] for record in photoprism_photos_export]
    assert Counter(p.id for p in photos) == Counter(export_ids)


@pytest.mark.asyncio
async def test_stream_image_yields_bytes_and_content_type():
    photo_id = "abc123"
    adapter = PhotoprismAdapter(base_url=RESPX_PHOTOPRISM_BASE_URL, token="test-token")
    try:
        with respx.mock:
            respx.get(f"{RESPX_PHOTOPRISM_BASE_URL}/api/v1/photos/{photo_id}/dl").mock(
                return_value=httpx.Response(
                    200,
                    content=MOCK_JPEG_BYTES,
                    headers={"content-type": "image/jpeg"},
                )
            )
            chunks, media_type = await adapter.stream_image(photo_id)
            assert media_type == "image/jpeg"
            body = b"".join([chunk async for chunk in chunks])
            assert body == MOCK_JPEG_BYTES
    finally:
        await adapter.aclose()


@pytest.mark.asyncio
async def test_stream_image_404_for_unknown_uid():
    adapter = PhotoprismAdapter(base_url=RESPX_PHOTOPRISM_BASE_URL, token="test-token")
    try:
        with respx.mock:
            respx.get(f"{RESPX_PHOTOPRISM_BASE_URL}/api/v1/photos/missing/dl").mock(
                return_value=httpx.Response(404)
            )
            with pytest.raises(httpx.HTTPStatusError):
                await adapter.stream_image("missing")
    finally:
        await adapter.aclose()
