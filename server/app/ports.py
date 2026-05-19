"""Load canonical port defaults from config/ports.env (overridable via environment)."""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


@dataclass(frozen=True, slots=True)
class PortDefaults:
    server_port: int
    client_port: int
    client_host: str

    @property
    def client_origin(self) -> str:
        return f"http://{self.client_host}:{self.client_port}"

    @property
    def server_origin(self) -> str:
        return f"http://{self.client_host}:{self.server_port}"


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def ports_env_path() -> Path:
    return repo_root() / "config" / "ports.env"


def _parse_ports_env(text: str) -> dict[str, str]:
    values: dict[str, str] = {}
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        key, sep, value = stripped.partition("=")
        if sep:
            values[key.strip()] = value.strip()
    return values


def _require_int(name: str, file_values: dict[str, str]) -> int:
    if name in os.environ:
        return int(os.environ[name])
    if name in file_values:
        return int(file_values[name])
    msg = f"Missing required port setting {name} (expected in config/ports.env or the environment)"
    raise ValueError(msg)


@lru_cache(maxsize=1)
def load_port_defaults() -> PortDefaults:
    path = ports_env_path()
    if not path.is_file():
        msg = f"Missing {path}"
        raise FileNotFoundError(msg)

    file_values = _parse_ports_env(path.read_text(encoding="utf-8"))
    client_host = os.environ.get("PHOTOFRAME_CLIENT_HOST") or file_values.get(
        "PHOTOFRAME_CLIENT_HOST", "localhost"
    )

    return PortDefaults(
        server_port=_require_int("PHOTOFRAME_SERVER_PORT", file_values),
        client_port=_require_int("PHOTOFRAME_CLIENT_PORT", file_values),
        client_host=client_host,
    )
