"""Unit tests for PhotoLibraryError → HTTPException mapping."""

import pytest
from fastapi import HTTPException

from app.api.v0.photo_library_http import raise_http_for_photo_library_error
from app.logging_setup import configure_logging, get_logger
from app.photo_source.errors import (
    PhotoLibraryForbiddenError,
    PhotoLibraryUpstreamError,
    PhotoNotFoundError,
)

configure_logging()
logger = get_logger("test")


def test_maps_not_found_to_404():
    with pytest.raises(HTTPException) as exc_info:
        raise_http_for_photo_library_error(
            PhotoNotFoundError(),
            logger=logger,
            upstream_log_event="test.upstream",
            backend="photoprism",
        )
    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Photo not found"


def test_maps_forbidden_to_403():
    with pytest.raises(HTTPException) as exc_info:
        raise_http_for_photo_library_error(
            PhotoLibraryForbiddenError(),
            logger=logger,
            upstream_log_event="test.upstream",
            backend="photoprism",
        )
    assert exc_info.value.status_code == 403


def test_maps_upstream_to_502():
    with pytest.raises(HTTPException) as exc_info:
        raise_http_for_photo_library_error(
            PhotoLibraryUpstreamError(status_code=500),
            logger=logger,
            upstream_log_event="test.upstream",
            backend="photoprism",
            photo_id="abc12345",
        )
    assert exc_info.value.status_code == 502
    assert exc_info.value.detail == "Upstream error"
