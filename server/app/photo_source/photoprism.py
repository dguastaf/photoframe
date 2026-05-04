from collections.abc import AsyncIterator

from app.photo_source.base import Photo, PhotoLibraryAdapter


class PhotoprismAdapter(PhotoLibraryAdapter):
    """Photoprism-backed PhotoLibraryAdapter.

    Phase 1 stub: not yet wired up. The routes currently return dummy data
    and never instantiate this class. Phase 2 will fill in:
      - shared httpx.AsyncClient with Bearer auth and explicit pool limits
      - paginated list_photos against Photoprism's /api/v1/photos
      - streaming stream_image at the highest available rendition
    """

    def __init__(self, base_url: str, token: str) -> None:
        self._base_url = base_url
        self._token = token

    async def list_photos(self) -> list[Photo]:
        raise NotImplementedError("PhotoprismAdapter.list_photos not yet implemented")

    async def stream_image(self, photo_id: str) -> tuple[AsyncIterator[bytes], str]:
        raise NotImplementedError("PhotoprismAdapter.stream_image not yet implemented")

    async def aclose(self) -> None:
        """Close any underlying connections. No-op in the stub."""
