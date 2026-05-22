from enum import StrEnum
from typing import Self

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.ports import CLIENT_DEV_ORIGIN


class PhotoSource(StrEnum):
    PHOTOPRISM = "photoprism"


class Settings(BaseSettings):
    """Runtime configuration. Only env-required values live here."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    photo_source: PhotoSource = PhotoSource.PHOTOPRISM

    photoprism_base_url: str
    photoprism_token: str

    # Unset → allow CLIENT_DEV_ORIGIN from config/ports.json. Empty → disable CORS.
    cors_origins: list[str] | None = Field(default=None, validation_alias="CORS_ORIGINS")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_cors_origins(cls, value: object) -> object:
        if value is None:
            return None
        if isinstance(value, str):
            if not value.strip():
                return []
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @model_validator(mode="after")
    def _default_cors_origins(self) -> Self:
        if self.cors_origins is None:
            object.__setattr__(self, "cors_origins", [CLIENT_DEV_ORIGIN])
        return self


settings = Settings()
