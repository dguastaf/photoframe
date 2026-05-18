from app.config import PhotoSource, Settings
from app.photo_source.base import PhotoLibraryAdapter
from app.photo_source.photoprism import PhotoprismAdapter


def create_photo_library_adapter(settings: Settings) -> PhotoLibraryAdapter:
    """Construct the photo backend adapter selected by PHOTO_SOURCE."""
    match settings.photo_source:
        case PhotoSource.PHOTOPRISM:
            return PhotoprismAdapter(
                base_url=settings.photoprism_base_url or "",
                token=settings.photoprism_token or "",
            )
        case _ as unknown:
            raise ValueError(f"Unsupported PHOTO_SOURCE: {unknown!r}")
