"""Unit tests for httpx → photo_source error mapping."""

import httpx

from app.photo_source.errors import (
    PhotoLibraryForbiddenError,
    PhotoLibraryUpstreamError,
    PhotoNotFoundError,
)
from app.photo_source.httpx_errors import map_httpx_status_error


def _http_status_error(status_code: int) -> httpx.HTTPStatusError:
    request = httpx.Request("GET", "http://photoprism.test/api/v1/photos")
    response = httpx.Response(status_code, request=request)
    return httpx.HTTPStatusError("error", request=request, response=response)


def test_map_httpx_status_error_404():
    assert isinstance(map_httpx_status_error(_http_status_error(404)), PhotoNotFoundError)


def test_map_httpx_status_error_403():
    assert isinstance(map_httpx_status_error(_http_status_error(403)), PhotoLibraryForbiddenError)


def test_map_httpx_status_error_other():
    mapped = map_httpx_status_error(_http_status_error(500))
    assert isinstance(mapped, PhotoLibraryUpstreamError)
    assert mapped.status_code == 500
