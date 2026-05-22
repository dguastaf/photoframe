#!/usr/bin/env python3
"""Start mock Photoframe API on the canonical dev port for client Playwright e2e."""

from __future__ import annotations

import json
import os
import signal
import sys
from pathlib import Path

SERVER_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVER_ROOT))
sys.path.insert(0, str(SERVER_ROOT / "tests"))

# Required before importing app.config (module-level Settings()).
os.environ.setdefault("PHOTOPRISM_BASE_URL", "http://127.0.0.1:9")
os.environ.setdefault("PHOTOPRISM_TOKEN", "ci-e2e-token")

from app.ports import SERVER_ORIGIN, SERVER_PORT
from support.photoframe_stack import PhotoframeTestStack

E2E_FIXTURE = SERVER_ROOT / "tests/fixtures/photoprism_photos_e2e.json"


def main() -> None:
    export = json.loads(E2E_FIXTURE.read_text(encoding="utf-8"))
    stack = PhotoframeTestStack.start_mock(export, port=SERVER_PORT)
    print(f"READY {SERVER_ORIGIN}", flush=True)

    def _stop(*_args: object) -> None:
        stack.stop()
        sys.exit(0)

    signal.signal(signal.SIGTERM, _stop)
    signal.signal(signal.SIGINT, _stop)
    signal.pause()


if __name__ == "__main__":
    main()
