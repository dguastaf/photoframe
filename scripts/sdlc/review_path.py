#!/usr/bin/env python3
"""Print the review JSON path for the current git branch."""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

SDLC_DIR = Path(__file__).resolve().parent
ROOT = SDLC_DIR.parents[1]
REVIEWS_DIR = SDLC_DIR / "reviews"

__all__ = ["ROOT", "SDLC_DIR", "REVIEWS_DIR", "branch_name", "branch_slug", "review_path"]


def branch_name() -> str:
    result = subprocess.run(
        ["git", "branch", "--show-current"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    branch = (result.stdout or "").strip()
    if result.returncode != 0 or not branch:
        raise SystemExit("error: not on a git branch (detached HEAD?)")
    return branch


def branch_slug(branch: str) -> str:
    slug = re.sub(r"[^A-Za-z0-9._-]+", "-", branch).strip("-")
    return slug or "branch"


def review_path(branch: str | None = None) -> Path:
    name = branch if branch is not None else branch_name()
    return REVIEWS_DIR / f"{branch_slug(name)}.json"


def main() -> None:
    path = review_path()
    if len(sys.argv) > 1 and sys.argv[1] == "--slug":
        print(branch_slug(branch_name()))
        return
    print(path)


if __name__ == "__main__":
    main()
