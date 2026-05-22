from datetime import datetime

from pydantic import BaseModel


class PhotoMetadata(BaseModel):
    """Wire-format response for a single photo entry."""

    id: str
    taken_at: datetime
    folder: str
