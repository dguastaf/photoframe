# Photoframe

A simple digital photo frame slideshow application backed by Photoprism.

## Context & Methodology
This app was built using an agent-first development workflow using Cursor, mainly for learning purposes. I'm trying to mimic a collaborative professional development environment.

[Product Spec](https://www.notion.so/Photoframe-PRD-c54cdc4f52e94cfabe20d7b940dcd854?source=copy_link): Written in Notion as a PM might, iterated on using a Plan agent in Cursor. Added functional requirements.


## Status

**Phase 1: scaffolding only.** The server starts, accepts requests, and returns dummy data. Photoprism is not yet wired up. The client is not yet built.

Treat this API **as unstable** until real backend integration lands—response shapes may change slightly while we shake out Photoprism behavior.

Contract routes are versioned at **`/api/v0/`** (`/health` is unversioned). The Photoprism adapter calls Photoprism's own `/api/v1/...` upstream paths.

## Layout

```
photoframe/
├── server/      # FastAPI server (Python)
├── client/      # React web app (placeholder; Phase 2)
└── docker-compose.yml
```

## Quickstart

Prerequisites: Docker + Docker Compose.

```bash
cp .env.example .env
docker compose up
```

Compose creates the image on first run. After you change `server/Dockerfile` or files under `server/app/` (which are **copied** into the image), rebuild before starting: `docker compose build` then `docker compose up` (or run the server locally with `uvicorn` during development).

The server listens on host port **52525**.

### Verify with curl / Postman

```bash
# Health
curl http://localhost:52525/health

# List photos (from Photoprism when PHOTO_SOURCE=photoprism and credentials are set)
curl http://localhost:52525/api/v0/photos | jq

# Image bytes (returns a placeholder PNG in Phase 1)
curl -o /tmp/photo.png http://localhost:52525/api/v0/photos/p1abc123/image
file /tmp/photo.png
```

All three should respond with HTTP 200.

## Configuration

See `.env.example` for all variables:

| Var | Purpose |
| --- | --- |
| `PHOTO_SOURCE` | Photo backend to use (`photoprism` today; more may follow) |
| `PHOTOPRISM_BASE_URL` | URL/IP of the Photoprism host, e.g. `http://photoprism.local:2342` |
| `PHOTOPRISM_TOKEN` | Bearer token for the Photoprism API |

`PHOTO_SOURCE` selects which adapter is constructed at startup and stored on `app.state.photo_library`. `GET /api/v0/photos` calls the adapter; `GET /api/v0/photos/{id}/image` still returns a placeholder PNG until `stream_image` is implemented.

## Development

### Cursor (automated)

Opening this repo in Cursor runs project hooks that:

1. Create `server/.venv` if missing (Python 3.12+)
2. Run `pip install -e ".[dev]"` to install pytest and other dev tools
3. Point the Python extension at `server/.venv` (see `.vscode/settings.json`)

Hooks: `.cursor/hooks.json` (`workspaceOpen` on folder open, `sessionStart` for agent sessions). Check **Cursor Settings → Hooks** or the **Hooks** output channel if setup does not run.

After hooks run (or after a manual setup below), from `server/`:

```bash
pytest
```

### Manual setup

```bash
cd server
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
pytest
```

See [server/TESTING.md](server/TESTING.md): tests live under `tests/unit/` and `tests/integration/`; integration mock mode spins up Photoframe + a mock Photoprism HTTP server automatically.

## What's next

- Wire `PhotoprismAdapter` to actually call the Photoprism API.
- Build the React client (`client/`).
- See `.cursor/plans/photoframe_greenfield_build_*.plan.md` for the full plan.
