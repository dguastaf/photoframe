# Photoframe

A simple digital photo frame slideshow application backed by Photoprism.

## Context & Methodology
This app was built using an agent-first development workflow using Cursor, mainly for learning purposes. I'm trying to mimic a collaborative professional development environment.

[Product Spec](https://www.notion.so/Photoframe-PRD-c54cdc4f52e94cfabe20d7b940dcd854?source=copy_link): Written in Notion as a PM might, iterated on using a Plan agent in Cursor. Added functional requirements.


## Status

**Phase 1 (in progress).** The server lists photos and streams image bytes from Photoprism when configured. The React client is a Vite scaffold (slideshow UI still to build).

Treat this API **as unstable** until real backend integration lands—response shapes may change slightly while we shake out Photoprism behavior.

Contract routes are versioned at **`/api/v0/`** (`/health` is unversioned). The Photoprism adapter calls Photoprism's own `/api/v1/...` upstream paths.

## Layout

```
photoframe/
├── config/      # Shared ports.json (fixed dev ports)
├── server/      # FastAPI server (Python)
├── client/      # React + Vite dev UI
└── docker-compose.yml
```

## Quickstart

Prerequisites: Docker + Docker Compose.

```bash
cp .env.example .env
docker compose up
```

Compose creates the image on first run. After you change `server/Dockerfile` or files under `server/app/` (which are **copied** into the image), rebuild before starting: `docker compose build` then `docker compose up` (or run the server locally with `uvicorn` during development).

Dev ports are fixed in [`config/ports.json`](config/ports.json) (API **52525**, Vite **6389**). The API allows the client dev origin for CORS (from that file unless you set `CORS_ORIGINS`). Vite proxies `/api` and `/health` to the server so fetches can use relative URLs in dev.

### Verify with curl / Postman

```bash
# Health
curl http://localhost:52525/health

# List photos (from Photoprism when PHOTO_SOURCE=photoprism and credentials are set)
curl http://localhost:52525/api/v0/photos | jq

# Image bytes (streams from Photoprism /dl via the adapter)
PHOTO_ID=$(curl -s http://localhost:52525/api/v0/photos | jq -r '.[0].id')
curl -o /tmp/photo.jpg "http://localhost:52525/api/v0/photos/${PHOTO_ID}/image"
file /tmp/photo.jpg
```

All three should respond with HTTP 200.

## Configuration

See `.env.example` for all variables:

| Var | Purpose |
| --- | --- |
| `PHOTO_SOURCE` | Photo backend to use (`photoprism` today; more may follow) |
| `PHOTOPRISM_BASE_URL` | URL/IP of the Photoprism host, e.g. `http://photoprism.local:2342` |
| `PHOTOPRISM_TOKEN` | Bearer token for the Photoprism API |
| `CORS_ORIGINS` | Optional override; when unset, defaults to the client dev origin in `config/ports.json`. Set empty if UI and API share one host. |

`PHOTO_SOURCE` selects which adapter is constructed at startup and stored on `app.state.photo_library`. Both `GET /api/v0/photos` and `GET /api/v0/photos/{id}/image` call the adapter (upstream `GET /api/v1/photos/{uid}/dl` with Bearer auth).

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

### Client (Vite + React)

```bash
cd client
npm install
npm run dev
```

Open http://localhost:6389 — the page checks `/health` via the Vite proxy. Start the API first (`docker compose up` or uvicorn on **52525**).

Client unit tests: `cd client && npm test`. See [client/TESTING.md](client/TESTING.md) for layout (`tests/unit/`, `tests/e2e/`).

#### UI preview assets (required for UI commits / PRs)

Any commit that changes UI source must update screenshots or videos under [`.github/ui-preview/`](.github/ui-preview/README.md). One-time repo setup:

```bash
./scripts/setup-git-hooks.sh
cd client && npm install && npx playwright install chromium
```

| Change | Command |
| --- | --- |
| Static layout / styling | `npm run ui:screenshot` |
| Interactions / flows | `npm run ui:video` |

Stage `.github/ui-preview/` in the same commit as the UI change. CI fails PRs that change UI without updated preview files.

## What's next

- Slideshow UI in `client/`.
- See `.cursor/plans/photoframe_greenfield_build_*.plan.md` for the full plan.
