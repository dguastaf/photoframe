from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from dataclasses import dataclass
from datetime import datetime


@dataclass(slots=True, frozen=True)
class Photo:
    id: str
    taken_at: datetime
    folder: str


class PhotoLibraryAdapter(ABC):
    """Adapts our slideshow API to a concrete photo backend (Photoprism, Immich, …).

    Implementations translate this contract into the backend's native API.
    Swapping backends is a one-class change behind this adapter.
    """

    @abstractmethod
    async def list_photos(self) -> list[Photo]:
        """Return the full set of photos in the configured backend."""

    @abstractmethod
    async def stream_image(self, photo_id: str) -> tuple[AsyncIterator[bytes], str]:
        """Open a streaming response for a single image.

        Returns a chunked async iterator of bytes plus the upstream Content-Type.
        Implementations must NOT buffer the full image into memory.
        """
