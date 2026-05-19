"""Unit tests for public photo_id validation."""

import pytest
from fastapi import HTTPException

from app.api.v0.photo_id import validate_photo_id


@pytest.mark.parametrize(
    "photo_id",
    [
        "r3og21yrn5ins39w",
        "pta0vvrm71syywta",
        "abc12345",
    ],
)
def test_validate_photo_id_accepts_photoprism_uids(photo_id: str):
    validate_photo_id(photo_id)


@pytest.mark.parametrize(
    "photo_id",
    [
        "",
        "x",
        "10000",
        "11-21",
        "UPPERCASE12",
        "has spaces",
        "pta0vvrm71syywta/extra",
        "../../secrets",
    ],
)
def test_validate_photo_id_rejects_malformed(photo_id: str):
    with pytest.raises(HTTPException) as exc_info:
        validate_photo_id(photo_id)
    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "Invalid photo id"
