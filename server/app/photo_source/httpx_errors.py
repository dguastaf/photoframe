"""Translate httpx failures into photo_source domain errors."""

import httpx

from app.photo_source.errors import (
    PhotoLibraryError,
    PhotoLibraryForbiddenError,
    PhotoLibraryUpstreamError,
    PhotoNotFoundError,
)


def map_httpx_status_error(exc: httpx.HTTPStatusError) -> PhotoLibraryError:
    match exc.response.status_code:
        case 404:
            return PhotoNotFoundError()
        case 403:
            return PhotoLibraryForbiddenError()
        case status_code:
            return PhotoLibraryUpstreamError(status_code=status_code)
