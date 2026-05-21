#!/usr/bin/env python3
"""Start mock Photoframe API on the canonical dev port for client Playwright e2e."""

from __future__ import annotations

import json
import signal
import sys
from pathlib import Path

SERVER_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVER_ROOT))
sys.path.insert(0, str(SERVER_ROOT / "tests"))

from app.ports import SERVER_PORT
from support.photoframe_stack import PhotoframeTestStack

fixture = SERVER_ROOT / "tests/fixtures/photoprism_photos_v0_response.json"
export = json.loads(fixture.read_text(encoding="utf-8"))
stack = PhotoframeTestStack.start_mock(export, port=SERVER_PORT)


def _stop(*_args: object) -> None:
    stack.stop()
    sys.exit(0)


signal.signal(signal.SIGTERM, _stop)
signal.signal(signal.SIGINT, _stop)
signal.pause()
