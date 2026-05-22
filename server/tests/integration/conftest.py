from __future__ import annotations

from collections.abc import Iterator

import httpx
import pytest

from support.api_client import PhotoframeApiClient, photoframe_base_url, photoframe_live_enabled
from support.photoframe_stack import PhotoframeTestStack


@pytest.fixture(scope="session")
def photoframe_is_live() -> bool:
    return photoframe_live_enabled()


@pytest.fixture(scope="session")
def photoframe_server_url(
    photoprism_photos_export: list[dict],
    photoframe_is_live: bool,
) -> Iterator[str]:
    if photoframe_is_live:
        yield photoframe_base_url()
        return

    stack = PhotoframeTestStack.start_mock(photoprism_photos_export)
    try:
        yield stack.photoframe_url
    finally:
        stack.stop()


@pytest.fixture
def photoframe_api(
    photoframe_server_url: str,
    photoframe_is_live: bool,
) -> Iterator[PhotoframeApiClient]:
    with httpx.Client(base_url=photoframe_server_url, timeout=120.0) as http:
        if photoframe_is_live:
            try:
                http.get("/api/v0/photos").raise_for_status()
            except httpx.HTTPError as exc:
                pytest.skip(f"Photoframe server not reachable at {photoframe_server_url}: {exc}")
        yield PhotoframeApiClient(http, is_live=photoframe_is_live)
