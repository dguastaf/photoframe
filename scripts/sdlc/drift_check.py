#!/usr/bin/env python3
"""Verify required SDLC automation files exist (see scripts/sdlc/README.md)."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

REQUIRED_PATHS = [
    "AI-SDLC.md",
    "scripts/sdlc/README.md",
    ".cursor/agents/staff-engineer.md",
    ".cursor/rules/planning-staff-review.mdc",
    ".cursor/rules/implementation-staff-review.mdc",
    ".cursor/rules/pre-pr-staff-review.mdc",
    ".cursor/hooks/before-pr-create.sh",
    ".cursor/hooks.json",
    "scripts/sdlc/changed_paths.py",
    "scripts/sdlc/review_path.py",
    "scripts/sdlc/record_phase.py",
    "scripts/sdlc/validate_review.py",
    "scripts/sdlc/sdlc-check.sh",
    ".github/workflows/ci.yml",
    ".github/pull_request_template.md",
]


def main() -> None:
    missing = [p for p in REQUIRED_PATHS if not (ROOT / p).is_file()]
    if missing:
        for path in missing:
            print(f"error: missing enforcement file: {path}", file=sys.stderr)
        raise SystemExit(1)
    print(f"sdlc drift check: {len(REQUIRED_PATHS)} paths ok")


if __name__ == "__main__":
    main()
