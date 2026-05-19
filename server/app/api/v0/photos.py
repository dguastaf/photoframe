"""Photo list and image streaming endpoints."""

import time

import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.logging_setup import get_logger
from app.models import PhotoMetadata

router = APIRouter()
logger = get_logger(__name__)


@router.get("/photos", response_model=list[PhotoMetadata])
async def list_photos(request: Request) -> list[PhotoMetadata]:
    started = time.perf_counter()
    raw_photos = await request.app.state.photo_library.list_photos()
    photos = [
        PhotoMetadata(id=p.id, taken_at=p.taken_at, folder=p.folder) for p in raw_photos
    ]
    duration_ms = (time.perf_counter() - started) * 1000
    logger.info(
        "photos.list.completed",
        duration_ms=round(duration_ms, 2),
        photo_count=len(photos),
        backend=request.app.state.photo_source,
    )
    return photos


@router.get("/photos/{photo_id}/image")
async def get_photo_image(photo_id: str, request: Request) -> StreamingResponse:
    started = time.perf_counter()
    backend = request.app.state.photo_source
    try:
        chunks, media_type = await request.app.state.photo_library.stream_image(photo_id)
    except httpx.HTTPStatusError as exc:
        status_code = exc.response.status_code
        logger.warning(
            "photos.image.upstream_error",
            photo_id=photo_id,
            status_code=status_code,
            backend=backend,
        )
        if status_code == 404:
            raise HTTPException(status_code=404, detail="Photo not found") from exc
        if status_code == 403:
            raise HTTPException(status_code=403, detail="Forbidden") from exc
        raise HTTPException(status_code=502, detail="Upstream error") from exc

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
