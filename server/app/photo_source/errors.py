"""Domain errors raised by photo library adapters (HTTP-agnostic)."""


class PhotoLibraryError(Exception):
    """Base for adapter failures surfaced to the API layer."""


class PhotoNotFoundError(PhotoLibraryError):
    """The requested photo does not exist in the backend."""


class PhotoLibraryForbiddenError(PhotoLibraryError):
    """The backend denied access (credentials, token, or ACL)."""


class PhotoLibraryUpstreamError(PhotoLibraryError):
    """An unexpected upstream failure (other HTTP status, network, etc.)."""

    def __init__(self, message: str = "Upstream error", *, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code
