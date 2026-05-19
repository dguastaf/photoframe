"""Integration tests — HTTP to a running Photoframe server only."""

from __future__ import annotations

from datetime import datetime

import pytest

from app.photo_source.photoprism import _PAGE_SIZE
from support.api_client import PhotoframeApiClient
from support.photoprism import metadata_json_from_export_record


def test_health(photoframe_api: PhotoframeApiClient):
    response = photoframe_api.get("/health")
    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_list_photos_returns_non_empty(photoframe_api: PhotoframeApiClient):
    assert photoframe_api.list_photos()


def test_list_photos_response_shape(photoframe_api: PhotoframeApiClient):
    for photo in photoframe_api.list_photos():
        assert {"id", "taken_at", "folder"} <= photo.keys()
        assert photo["id"]
        assert isinstance(photo["folder"], str)
        taken_at = datetime.fromisoformat(photo["taken_at"].replace("Z", "+00:00"))
        assert taken_at.tzinfo is not None


def test_list_photos_unique_ids(photoframe_api: PhotoframeApiClient):
    if not photoframe_api.is_live:
        pytest.skip("Uniqueness is validated against a real library in live mode only")
    photos = photoframe_api.list_photos()
    ids = [p["id"] for p in photos]
    assert len(ids) == len(set(ids))


def test_list_photos_large_library(photoframe_api: PhotoframeApiClient):
    assert len(photoframe_api.list_photos()) > _PAGE_SIZE


def test_list_photos_mock_matches_fixture_bookends(
    photoframe_api: PhotoframeApiClient,
    photoprism_photos_export: list[dict],
):
    if photoframe_api.is_live:
        pytest.skip("Fixture bookends apply to mock downstream only")
    photos = photoframe_api.list_photos()
    assert len(photos) == len(photoprism_photos_export)
    assert photos[0] == metadata_json_from_export_record(photoprism_photos_export[0])
    assert photos[-1] == metadata_json_from_export_record(photoprism_photos_export[-1])


def test_get_photo_image_returns_png(photoframe_api: PhotoframeApiClient):
    photo_id = photoframe_api.list_photos()[0]["id"]
    response = photoframe_api.get(f"/api/v0/photos/{photo_id}/image")
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert response.headers.get("cache-control") == "public, max-age=3600"
    assert response.content.startswith(b"\x89PNG")


@pytest.mark.live
def test_list_photos_live_summary(photoframe_api: PhotoframeApiClient):
    if not photoframe_api.is_live:
        pytest.skip("Summary logging is only useful in live mode")
    photos = photoframe_api.list_photos()
    sample = photos[0]
    print(f"live library: {len(photos)} photos")
    print(
        f"first: id={sample['id']!r} folder={sample['folder']!r} "
        f"taken_at={sample['taken_at']}"
    )
    print(f"last:  id={photos[-1]['id']!r} folder={photos[-1]['folder']!r}")
