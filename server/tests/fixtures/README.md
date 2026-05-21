# Test fixtures

## `photoprism_photos_v0_response.json`

Obfuscated export of a live Photoprism `GET /api/v1/photos` response (7068 records). Safe to commit and share publicly.

Album paths, titles, GPS, hashes, and timestamps were generalized or remapped. Do not replace with a raw export.

## `photoprism_photos_e2e.json`

Small subset (3 records) of the export above for fast client Playwright e2e in CI (`server/scripts/ci_client_e2e_stack.py`).
