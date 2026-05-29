import sys
from collections.abc import AsyncIterator
import httpx

from app.photo_source.base import Photo, PhotoLibraryAdapter
from app.photo_source.photoprism_normalize import taken_at_from_record
from app.photo_source.httpx_errors import map_httpx_status_error

_PAGE_SIZE = 1000
_REQUIRED_RECORD_KEYS = ("UID", "TakenAt", "Path")


def _list_photos_params(offset: int) -> dict[str, str | int]:
    return {"count": _PAGE_SIZE, "offset": offset, "primary": "true"}


def _parse_pagination_headers(count_header: str, limit_header: str) -> tuple[int, int]:
    try:
        count = int(count_header)
        limit = int(limit_header)
    except ValueError as exc:
        msg = f"Invalid Photoprism pagination headers: X-Count={count_header!r}, X-Limit={limit_header!r}"
        raise ValueError(msg) from exc
    if count < 0 or limit < 0:
        msg = f"Negative Photoprism pagination headers: X-Count={count}, X-Limit={limit}"
        raise ValueError(msg)
    if count > limit:
        msg = f"X-Count ({count}) exceeds X-Limit ({limit})"
        raise ValueError(msg)
    return count, limit


def _photo_from_record(record: dict) -> Photo:
    missing = [key for key in _REQUIRED_RECORD_KEYS if key not in record]
    if missing:
        msg = f"Photoprism photo record missing required keys: {', '.join(missing)}"
        raise ValueError(msg)
    return Photo(
        id=record["UID"],
        taken_at=taken_at_from_record(record),
        folder=record["Path"],
    )


class PhotoprismAdapter(PhotoLibraryAdapter):
    """Photoprism-backed PhotoLibraryAdapter."""

    def __init__(self, base_url: str, token: str) -> None:
        self._base_url = base_url.rstrip("/")
        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            headers={"Authorization": f"Bearer {token}"},
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
            timeout=httpx.Timeout(10.0, read=30.0),
        )

    async def list_photos(self) -> list[Photo]:
        photos: list[Photo] = []
        offset = 0
        # Seed so the first page is fetched; updated from each response below.
        count = _PAGE_SIZE
        limit = _PAGE_SIZE

        while count == limit:
            try:
                response = await self._client.get(
                    "/api/v1/photos",
                    params=_list_photos_params(offset),
                )
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                raise map_httpx_status_error(exc) from exc

            batch = response.json()
            if not isinstance(batch, list):
                msg = f"Unexpected Photoprism response type: {type(batch).__name__}"
                raise TypeError(msg)

            photos.extend(_photo_from_record(record) for record in batch)

            count_header = response.headers.get("X-Count")
            limit_header = response.headers.get("X-Limit")
            if count_header is not None and limit_header is not None:
                count, limit = _parse_pagination_headers(count_header, limit_header)
            else:
                count = len(batch)
                limit = _PAGE_SIZE

            offset += count

        return photos

    async def stream_image(self, photo_id: str) -> tuple[AsyncIterator[bytes], str]:
        stream = self._client.stream("GET", f"/api/v1/photos/{photo_id}/dl")
        response = await stream.__aenter__()
        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            await stream.__aexit__(*sys.exc_info())
            raise map_httpx_status_error(exc) from exc
        except BaseException:
            await stream.__aexit__(*sys.exc_info())
            raise

        media_type = response.headers.get("content-type", "application/octet-stream")

        async def chunks() -> AsyncIterator[bytes]:
            try:
                async for chunk in response.aiter_bytes():
                    yield chunk
            finally:
                await stream.__aexit__(None, None, None)

        return chunks(), media_type

    async def aclose(self) -> None:
        await self._client.aclose()
