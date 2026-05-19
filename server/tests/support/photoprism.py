"""Photoprism mock helpers for unit (respx) and integration (HTTP stub server)."""

from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime

from httpx import Request, Response

from app.photo_source.base import Photo
from app.photo_source.photoprism import _PAGE_SIZE

# Used by respx in unit tests only.
RESPX_PHOTOPRISM_BASE_URL = "http://photoprism.test"

# Minimal valid 1x1 JPEG for mock upstream /dl responses.
MOCK_JPEG_BYTES = bytes.fromhex(
    "ffd8ffe000104a46494600010101006000600000"
    "ffdb00430008060607060508080707070909080a0c140d0c0b0b0c1912130f"
    "141d1a1f1e1d1a1c1c20242e2728222c241c1c2837342e333635323634"
    "ffdb0043010909090c0b0c180d0d1832211c2134343428091c383d2c373336"
    "2837343235090c0d0e0f101112131415161718191a1b1c1d1e1f2021222324"
    "25262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f"
    "ffc00011080001000103011100021100031101"
    "ffda000c03010002110311003f00fcd4c8ffc4"
)


def photo_from_export_record(record: dict) -> Photo:
    taken_at = datetime.fromisoformat(record["TakenAt"].replace("Z", "+00:00")).astimezone(UTC)
    return Photo(id=record["UID"], taken_at=taken_at, folder=record["Path"])


def metadata_json_from_export_record(record: dict) -> dict:
    photo = photo_from_export_record(record)
    taken_at = photo.taken_at.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    return {"id": photo.id, "taken_at": taken_at, "folder": photo.folder}


def paginated_batch(
    export: list[dict],
    *,
    offset: int,
    count: int = _PAGE_SIZE,
) -> tuple[list[dict], dict[str, str]]:
    batch = export[offset : offset + count]
    headers = {"X-Count": str(len(batch)), "X-Limit": str(count)}
    return batch, headers


def paginated_photos_response(request: Request, export: list[dict]) -> Response:
    offset = int(request.url.params.get("offset", "0"))
    count = int(request.url.params.get("count", str(_PAGE_SIZE)))
    batch, headers = paginated_batch(export, offset=offset, count=count)
    return Response(200, json=batch, headers=headers)


def make_respx_side_effect(
    export: list[dict],
    requested_offsets: list[int],
) -> Callable[[Request], Response]:
    def side_effect(request: Request) -> Response:
        offset = int(request.url.params.get("offset", "0"))
        if offset not in requested_offsets:
            requested_offsets.append(offset)
        return paginated_photos_response(request, export)

    return side_effect
