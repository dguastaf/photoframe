"""Photo list and image streaming endpoints."""

import time

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from app.api.v0.photo_id import validate_photo_id
from app.api.v0.photo_library_http import raise_http_for_photo_library_error
from app.logging_setup import get_logger
from app.models import PhotoMetadata
from app.photo_source.errors import PhotoLibraryError

router = APIRouter()
logger = get_logger(__name__)


@router.get("/photos", response_model=list[PhotoMetadata])
async def list_photos(request: Request) -> list[PhotoMetadata]:
    started = time.perf_counter()
    backend = request.app.state.photo_source
    try:
        raw_photos = await request.app.state.photo_library.list_photos()
    except PhotoLibraryError as exc:
        raise_http_for_photo_library_error(
            exc,
            logger=logger,
            upstream_log_event="photos.list.upstream_error",
            backend=backend,
        )
    photos = [
        PhotoMetadata(id=p.id, taken_at=p.taken_at, folder=p.folder) for p in raw_photos
    ]
    duration_ms = (time.perf_counter() - started) * 1000
    logger.info(
        "photos.list.completed",
        duration_ms=round(duration_ms, 2),
        photo_count=len(photos),
        backend=backend,
    )
    return photos


@router.get("/photos/{photo_id}/image")
async def get_photo_image(photo_id: str, request: Request) -> StreamingResponse:
    validate_photo_id(photo_id)
    started = time.perf_counter()
    backend = request.app.state.photo_source
    try:
        chunks, media_type = await request.app.state.photo_library.stream_image(photo_id)
    except PhotoLibraryError as exc:
        raise_http_for_photo_library_error(
            exc,
            logger=logger,
            upstream_log_event="photos.image.upstream_error",
            backend=backend,
            photo_id=photo_id,
        )

    async def logged_chunks():
        try:
            async for chunk in chunks:
                yield chunk
        finally:
            duration_ms = (time.perf_counter() - started) * 1000
            logger.info(
                "photos.image.completed",
                photo_id=photo_id,
                duration_ms=round(duration_ms, 2),
                backend=backend,
            )

    return StreamingResponse(
        logged_chunks(),
        media_type=media_type,
        headers={"Cache-Control": "public, max-age=3600"},
    )
