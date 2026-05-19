# Photoframe — anti-slop and quality bar

Apply these rules to **changed files only**. Prefer blocking bugs with file, line, and a concrete fix.

## AI slop (blocking)

- Extra comments that restate the code, section banners, or narration a human would not add in this repo.
- New `try/except` (or broad `except Exception`) around trusted internal paths unless the same module already uses that pattern.
- `# type: ignore`, unchecked casts, or `Any` used only to silence the type checker.
- `print()` or debug logging added outside tests; production code uses **structlog** consistently.
- Drive-by refactors, renames, or formatting churn unrelated to the PR purpose.
- Oversized functions (> ~60 lines) or new modules that duplicate logic already in `server/app/photo_source/`.

## Architecture (blocking)

- Backend integration must go through **`PhotoLibraryAdapter`** in `server/app/photo_source/`. Do not call Photoprism/Immich HTTP APIs directly from route handlers.
- Image paths must **stream** (`AsyncIterator[bytes]`); flag buffering full images in memory.
- Public API routes stay under **`/api/v0/`** unless the PR explicitly versions a new surface.

## Tests (blocking)

- If `server/app/**` changes (excluding pure config/docs), require matching updates under `server/tests/` (unit and/or integration as appropriate).
- New adapter or API behavior needs tests with **respx** / existing test fixtures; do not rely on live Photoprism in CI.

## Style (non-blocking unless severe)

- Match existing patterns: dataclasses with `slots=True` where used, async handlers, minimal docstrings on public adapter methods only.
- Prefer explicit errors over silent fallbacks; the server is intentionally stateless—flag new server-side session state without justification.

## Reporting

- Use **blocking** severity for slop and architecture violations.
- End review comments with a one-line summary: slop-clean vs issues-found.
