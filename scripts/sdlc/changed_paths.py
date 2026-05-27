#!/usr/bin/env python3
"""Classify PR diffs: product/behavior changes vs process-only (SDLC, docs, CI wiring)."""

from __future__ import annotations

import subprocess
from pathlib import Path

# Paths that imply app behavior or automated product tests should run / test plan required.
PRODUCT_PREFIXES = (
    "server/app/",
    "client/src/",
    "server/tests/",
    "client/tests/",
    "server/scripts/",
    "scripts/ui-preview/",
)

PRODUCT_EXACT = frozenset(
    {
        "server/pyproject.toml",
        "client/package.json",
        "client/package-lock.json",
        ".env.example",
        "docker-compose.yml",
        "Dockerfile",
    }
)


def requires_product_verification(path: str) -> bool:
    """True when a changed file can affect runtime behavior or product test suites."""
    normalized = path.replace("\\", "/").lstrip("./")
    if normalized in PRODUCT_EXACT:
        return True
    return any(normalized.startswith(prefix) for prefix in PRODUCT_PREFIXES)


def requires_product_verification_for_changes(paths: list[str]) -> bool:
    """True if any changed file needs a substantive PR test plan or staff-engineer on product work."""
    if not paths:
        return False
    return any(requires_product_verification(p) for p in paths)


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
