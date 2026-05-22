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
├── docker/      # nginx config + container entrypoint
├── server/      # FastAPI server (Python)
├── client/      # React + Vite dev UI
├── Dockerfile   # Production image (UI + API)
└── docker-compose.yml
```

## Quickstart

Prerequisites: Docker + Docker Compose.

```bash
cp .env.example .env   # set PHOTOPRISM_* (see Configuration)
docker compose up -d
```

Open **http://localhost:6389** — one container serves the UI and proxies `/api` and `/health` to the API process inside the same image. Port **52525** is not published on the host.

**Updates** (no separate `docker compose build`):

```bash
docker compose down
git pull
docker compose up -d
```

Compose rebuilds the image when the Dockerfile or build context change (`pull_policy: build`).

Dev ports are fixed in [`config/ports.json`](config/ports.json) (API **52525**, client **6389**). For local Vite dev, the API allows the client dev origin for CORS (from that file unless you set `CORS_ORIGINS`). Vite proxies `/api` and `/health` to the server so fetches can use relative URLs in dev.

### Verify with curl

Through the UI port (Docker stack):

```bash
curl http://localhost:6389/health
curl http://localhost:6389/api/v0/photos | jq
PHOTO_ID=$(curl -s http://localhost:6389/api/v0/photos | jq -r '.[0].id')
curl -o /tmp/photo.jpg "http://localhost:6389/api/v0/photos/${PHOTO_ID}/image"
file /tmp/photo.jpg
```

Direct API (local uvicorn on **52525** only — not exposed by `docker compose`):

```bash
curl http://localhost:52525/health
```

All compose checks should return HTTP 200 when Photoprism is configured.

## Configuration

See `.env.example` for all variables:

| Var | Purpose |
| --- | --- |
| `PHOTO_SOURCE` | Photo backend to use (`photoprism` today; more may follow) |
| `PHOTOPRISM_BASE_URL` | URL/IP of the Photoprism host, e.g. `http://photoprism.local:2342` |
| `PHOTOPRISM_TOKEN` | Bearer token for the Photoprism API |
| `CORS_ORIGINS` | Optional override; when unset, defaults to the client dev origin in `config/ports.json`. Not needed when using Docker compose (UI and API share port **6389** via nginx). |

**Photoprism from Docker:** `PHOTOPRISM_BASE_URL` must be reachable from the **app** container. If Photoprism runs on the Docker host, use the host LAN IP (not `http://localhost:...`).

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

#### UI preview assets (required for UI pull requests)

Pull requests that change UI source must include updated screenshots or videos under [`.github/ui-preview/`](.github/ui-preview/README.md). You can refresh assets in any commit on the branch before opening the PR. One-time capture setup:

```bash
cd client && npm install && npx playwright install chromium
```

| Change | Command |
| --- | --- |
| Static layout / styling | `npm run ui:screenshot` |
| Interactions / flows | `npm run ui:video` |

CI fails PRs that change UI without updated preview files.

## What's next

- Slideshow UI in `client/`.
- See `.cursor/plans/photoframe_greenfield_build_*.plan.md` for the full plan.
