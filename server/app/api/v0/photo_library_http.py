"""Map photo_source domain errors to FastAPI HTTP responses."""

from typing import NoReturn

from fastapi import HTTPException

from app.photo_source.errors import (
    PhotoLibraryError,
    PhotoLibraryForbiddenError,
    PhotoLibraryUpstreamError,
    PhotoNotFoundError,
)


def raise_http_for_photo_library_error(
    exc: PhotoLibraryError,
    *,
    logger,
    upstream_log_event: str,
    backend: str,
    photo_id: str | None = None,
) -> NoReturn:
    """Convert a port-layer error into HTTPException (and log upstream failures)."""
    match exc:
        case PhotoNotFoundError():
            raise HTTPException(status_code=404, detail="Photo not found") from exc
        case PhotoLibraryForbiddenError():
            raise HTTPException(status_code=403, detail="Forbidden") from exc
        case PhotoLibraryUpstreamError():
            log_fields: dict[str, object] = {
                "status_code": exc.status_code,
                "backend": backend,
            }
            if photo_id is not None:
                log_fields["photo_id"] = photo_id
            logger.warning(upstream_log_event, **log_fields)
            raise HTTPException(status_code=502, detail="Upstream error") from exc
        case _:
            raise HTTPException(status_code=502, detail="Upstream error") from exc
