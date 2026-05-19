"""Validation for Photoprism-style photo UIDs exposed as public photo_id."""

import re

from fastapi import HTTPException

# Photoprism UIDs are random lowercase alphanumeric strings (typically ~12–16 chars).
_PHOTO_ID_RE = re.compile(r"^[a-z0-9]{8,32}$")


def validate_photo_id(photo_id: str) -> None:
    """Reject malformed IDs before calling upstream. Well-formed unknown IDs may still 404."""
    if not _PHOTO_ID_RE.fullmatch(photo_id):
        raise HTTPException(status_code=400, detail="Invalid photo id")
