"""Photo list and image streaming endpoints."""

import time
from datetime import datetime, timezone

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from app.logging_setup import get_logger
from app.models import PhotoMetadata

router = APIRouter()
logger = get_logger(__name__)


# --- Phase 1 dummy data --------------------------------------------------
# These constants stand in for the real Photoprism integration so the API
# can be exercised end-to-end (Postman / curl) before wiring the backend.
# They will be removed once `PhotoprismAdapter` is implemented.

_DUMMY_PHOTOS: list[PhotoMetadata] = [
    PhotoMetadata(
        id="p1abc123",
        taken_at=datetime(2024, 3, 14, 10, 30, tzinfo=timezone.utc),
        folder="Vacation 2024",
    ),
    PhotoMetadata(
        id="p2def456",
        taken_at=datetime(2023, 12, 25, 8, 15, tzinfo=timezone.utc),
        folder="Family",
    ),
    PhotoMetadata(
        id="p3ghi789",
        taken_at=datetime(2025, 7, 4, 16, 45, tzinfo=timezone.utc),
        folder="Summer",
    ),
]

# Smallest valid 1x1 transparent PNG (67 bytes). Used as a placeholder so the
# /image endpoint returns something a browser/Postman can render.
_DUMMY_PNG: bytes = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
    "0000000d49444154789c63fcffff3f0005fe02fea135818400000000"
    "49454e44ae426082"
)


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
async def get_photo_image(photo_id: str) -> StreamingResponse:
    async def _chunks():
        # Single-chunk stream for the placeholder. Once PhotoprismAdapter is
        # wired up this will become a real chunked passthrough.
        yield _DUMMY_PNG

    return StreamingResponse(
        _chunks(),
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=3600"},
    )
