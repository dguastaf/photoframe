#!/usr/bin/env python3
"""Classify PR diffs for SDLC gates (production code vs everything else)."""

from __future__ import annotations

import subprocess
from pathlib import Path

# Production/runtime code and config — changes here require a substantive PR test plan.
PRODUCTION_PREFIXES = (
    "server/app/",
    "client/src/",
)

PRODUCTION_EXACT = frozenset(
    {
        "server/pyproject.toml",
        "client/package.json",
        "client/package-lock.json",
        ".env.example",
        "docker-compose.yml",
        "Dockerfile",
    }
)


def is_production_code_path(path: str) -> bool:
    """True when a changed file is production app code or runtime-facing config."""
    normalized = path.replace("\\", "/")
    while normalized.startswith("./"):
        normalized = normalized[2:]
    if normalized in PRODUCTION_EXACT:
        return True
    return any(normalized.startswith(prefix) for prefix in PRODUCTION_PREFIXES)


def production_code_changed(paths: list[str]) -> bool:
    """True if the diff touches any production code path (test plan required)."""
    if not paths:
        return False
    return any(is_production_code_path(p) for p in paths)


def git_changed_files(base_ref: str, *, cwd: Path | None = None) -> list[str]:
    """Return paths changed between base_ref and HEAD (merge-base triple-dot)."""
    work = cwd or Path.cwd()
    result = subprocess.run(
        ["git", "diff", "--name-only", f"{base_ref}...HEAD"],
        cwd=work,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise SystemExit(
            f"error: git diff failed for {base_ref}...HEAD: {result.stderr.strip()}"
        )
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def resolve_base_ref(explicit: str | None, cwd: Path | None = None) -> str:
    work = cwd or Path.cwd()
    if explicit:
        return explicit
    for candidate in ("origin/main", "main"):
        check = subprocess.run(
            ["git", "rev-parse", "--verify", candidate],
            cwd=work,
            capture_output=True,
            check=False,
        )
        if check.returncode == 0:
            return candidate
    raise SystemExit("error: could not resolve base ref (try --base-ref origin/main)")
