from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration. Only env-required values live here."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # TODO(phase-2): make these required (no default) once PhotoprismAdapter
    # actually consumes them. They are intentionally optional during scaffolding
    # so the container can boot and serve dummy data without a populated .env.
    photoprism_base_url: str | None = Field(default=None)
    photoprism_token: str | None = Field(default=None)


settings = Settings()
