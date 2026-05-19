from enum import StrEnum
from typing import Self

from pydantic import Field, computed_field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.ports import load_port_defaults, ports_env_path, repo_root

_port_defaults = load_port_defaults()


class PhotoSource(StrEnum):
    PHOTOPRISM = "photoprism"


class Settings(BaseSettings):
    """Runtime configuration. Only env-required values live here."""

    model_config = SettingsConfigDict(
        env_file=(
            ports_env_path(),
            repo_root() / ".env",
        ),
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    photo_source: PhotoSource = PhotoSource.PHOTOPRISM

    # TODO(phase-2): make these required (no default) once PhotoprismAdapter
    # actually consumes them. They are intentionally optional during scaffolding
    # so the container can boot and serve dummy data without a populated .env.
    photoprism_base_url: str | None = Field(default=None)
    photoprism_token: str | None = Field(default=None)

    server_port: int = Field(
        default=_port_defaults.server_port,
        validation_alias="PHOTOFRAME_SERVER_PORT",
    )
    client_dev_port: int = Field(
        default=_port_defaults.client_port,
        validation_alias="PHOTOFRAME_CLIENT_PORT",
    )
    client_dev_host: str = Field(
        default=_port_defaults.client_host,
        validation_alias="PHOTOFRAME_CLIENT_HOST",
    )

    # Unset → allow client_dev_origin. Empty string → disable cross-origin access.
    cors_origins: list[str] | None = Field(default=None, validation_alias="CORS_ORIGINS")

    @computed_field  # type: ignore[prop-decorator]
    @property
    def client_dev_origin(self) -> str:
        return f"http://{self.client_dev_host}:{self.client_dev_port}"

    @computed_field  # type: ignore[prop-decorator]
    @property
    def server_origin(self) -> str:
        return f"http://{self.client_dev_host}:{self.server_port}"

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
            object.__setattr__(self, "cors_origins", [self.client_dev_origin])
        return self


settings = Settings()
