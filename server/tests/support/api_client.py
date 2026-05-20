"""HTTP client for Photoframe integration tests."""

from __future__ import annotations

import os

import httpx

from app.ports import SERVER_ORIGIN

LIST_PHOTOS_PATH = "/api/v0/photos"


def photoframe_live_enabled() -> bool:
    return os.environ.get("PHOTOFRAME_LIVE_TEST") == "1"


def photoframe_base_url() -> str:
    return os.environ.get("PHOTOFRAME_BASE_URL", SERVER_ORIGIN)


class PhotoframeApiClient:
    def __init__(self, http: httpx.Client, *, is_live: bool) -> None:
        self._http = http
        self.is_live = is_live

    def get(self, path: str) -> httpx.Response:
        return self._http.get(path)

    def list_photos(self) -> list[dict]:
        response = self.get(LIST_PHOTOS_PATH)
        if response.status_code >= 400:
            response.raise_for_status()
        body = response.json()
        assert isinstance(body, list)
        return body
