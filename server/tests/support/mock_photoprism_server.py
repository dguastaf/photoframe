"""Minimal HTTP server that mimics Photoprism GET /api/v1/photos pagination."""

from __future__ import annotations

import socket
import threading
import time
from typing import Self

import httpx
import uvicorn
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Route

from app.photo_source.photoprism import _PAGE_SIZE
from support.photoprism import paginated_batch


def _find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def _build_app(export: list[dict]) -> Starlette:
    async def list_photos(request: Request) -> JSONResponse:
        offset = int(request.query_params.get("offset", 0))
        count = int(request.query_params.get("count", _PAGE_SIZE))
        batch, headers = paginated_batch(export, offset=offset, count=count)
        return JSONResponse(batch, headers=headers)

    return Starlette(routes=[Route("/api/v1/photos", list_photos)])


def _wait_until_ready(base_url: str, timeout_s: float = 10.0) -> None:
    deadline = time.monotonic() + timeout_s
    last_error: Exception | None = None
    while time.monotonic() < deadline:
        try:
            httpx.get(
                f"{base_url}/api/v1/photos",
                params={"count": 1, "offset": 0, "primary": "true"},
                timeout=1.0,
            ).raise_for_status()
            return
        except Exception as exc:
            last_error = exc
            time.sleep(0.05)
    msg = f"Mock Photoprism did not become ready at {base_url}: {last_error}"
    raise RuntimeError(msg)


class MockPhotoprismServer:
    def __init__(self, export: list[dict], port: int) -> None:
        self.base_url = f"http://127.0.0.1:{port}"
        self._config = uvicorn.Config(
            _build_app(export),
            host="127.0.0.1",
            port=port,
            log_level="warning",
        )
        self._server = uvicorn.Server(self._config)
        self._thread = threading.Thread(target=self._server.run, daemon=True)

    @classmethod
    def start(cls, export: list[dict]) -> Self:
        instance = cls(export, _find_free_port())
        instance._thread.start()
        _wait_until_ready(instance.base_url)
        return instance

    def stop(self) -> None:
        self._server.should_exit = True
        self._thread.join(timeout=5.0)
