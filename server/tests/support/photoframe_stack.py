"""Start Photoframe (+ mock Photoprism) for integration tests."""

from __future__ import annotations

import os
import socket
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Self

import httpx

from support.mock_photoprism_server import MockPhotoprismServer

SERVER_ROOT = Path(__file__).resolve().parents[2]


def _find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def _wait_for_health(base_url: str, timeout_s: float = 30.0) -> None:
    deadline = time.monotonic() + timeout_s
    last_error: Exception | None = None
    while time.monotonic() < deadline:
        try:
            httpx.get(f"{base_url}/health", timeout=1.0).raise_for_status()
            return
        except Exception as exc:
            last_error = exc
            time.sleep(0.1)
    msg = f"Photoframe server did not become ready at {base_url}: {last_error}"
    raise RuntimeError(msg)


@dataclass
class PhotoframeTestStack:
    photoframe_url: str
    mock_photoprism: MockPhotoprismServer | None
    _process: subprocess.Popen[bytes] | None

    @classmethod
    def start_mock(cls, export: list[dict], *, port: int | None = None) -> Self:
        mock = MockPhotoprismServer.start(export)
        listen_port = port if port is not None else _find_free_port()
        photoframe_url = f"http://127.0.0.1:{listen_port}"
        env = {
            **os.environ,
            "PHOTO_SOURCE": "photoprism",
            "PHOTOPRISM_BASE_URL": mock.base_url,
            "PHOTOPRISM_TOKEN": "integration-test-token",
        }
        process = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "app.main:app",
                "--host",
                "127.0.0.1",
                "--port",
                str(listen_port),
            ],
            cwd=SERVER_ROOT,
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        try:
            _wait_for_health(photoframe_url)
        except Exception:
            process.terminate()
            mock.stop()
            raise
        return cls(photoframe_url=photoframe_url, mock_photoprism=mock, _process=process)

    def stop(self) -> None:
        if self._process is not None:
            self._process.terminate()
            try:
                self._process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self._process.kill()
        if self.mock_photoprism is not None:
            self.mock_photoprism.stop()
