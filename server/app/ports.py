"""Canonical dev ports (see config/ports.json)."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path


def _ports_json_path() -> Path:
    candidates = (
        Path(__file__).resolve().parents[2] / "config" / "ports.json",
        Path("/config/ports.json"),
    )
    for path in candidates:
        if path.is_file():
            return path
    msg = "config/ports.json not found (repo checkout or /config/ports.json in Docker)"
    raise FileNotFoundError(msg)


@lru_cache(maxsize=1)
def _load() -> dict[str, int | str]:
    return json.loads(_ports_json_path().read_text(encoding="utf-8"))


_data = _load()
SERVER_PORT: int = int(_data["serverPort"])
CLIENT_DEV_PORT: int = int(_data["clientDevPort"])
CLIENT_DEV_HOST: str = str(_data["clientDevHost"])
CLIENT_DEV_ORIGIN = f"http://{CLIENT_DEV_HOST}:{CLIENT_DEV_PORT}"
SERVER_ORIGIN = f"http://{CLIENT_DEV_HOST}:{SERVER_PORT}"
