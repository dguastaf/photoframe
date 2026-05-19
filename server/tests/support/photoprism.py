"""Photoprism mock helpers for unit (respx) and integration (HTTP stub server)."""

from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime

from httpx import Request, Response

from app.photo_source.base import Photo
from app.photo_source.photoprism import _PAGE_SIZE

# Used by respx in unit tests only.
RESPX_PHOTOPRISM_BASE_URL = "http://photoprism.test"


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
