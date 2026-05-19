import pytest
from pydantic import ValidationError

from app.config import PhotoSource, Settings
from app.photo_source import create_photo_library_adapter
from app.photo_source.photoprism import PhotoprismAdapter


def test_create_photoprism_adapter():
    settings = Settings(
        photo_source=PhotoSource.PHOTOPRISM,
        photoprism_base_url="http://photoprism.local:2342",
        photoprism_token="secret",
    )
    adapter = create_photo_library_adapter(settings)
    assert isinstance(adapter, PhotoprismAdapter)
    assert adapter._base_url == "http://photoprism.local:2342"
    assert adapter._client.headers["Authorization"] == "Bearer secret"


def test_photo_source_defaults_to_photoprism():
    settings = Settings()
    assert settings.photo_source is PhotoSource.PHOTOPRISM


def test_unknown_photo_source_rejected():
    with pytest.raises(ValidationError):
        Settings(photo_source="immich")
