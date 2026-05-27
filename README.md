# Photoframe

A simple digital photo frame slideshow application backed by Photoprism.

[Product Spec](https://www.notion.so/Photoframe-PRD-c54cdc4f52e94cfabe20d7b940dcd854)


## Agent-First Development Methodology
Mainly for learning purposes, this app was built using an agent-first development workflow. Agents were used in almost every part of the software development process. As much as possible, workflow mirrors a collaborative, professional development environment.

### Product Spec & Project Plan
- I created a detailed list of product requirements. Agents added details and organized the document. Agents stress-tested the requirements to find missing details.
- I added functional and technical requirements in a similar manner: I created the list, agents added detail and validation.
- Agents then created tickets/tasks in Notion.

### Agent-first Software Development

Source of truth for process and workflow: [`AI-SDLC.md`](AI-SDLC.md).

## Usage

### Quickstart

Prerequisites: Docker + Docker Compose.

1. Install and configure Photoprism. Obtain an "Access Token" from your Photoprism instance. See the [Photoprism API Access documentation](https://docs.photoprism.app/api/#authentication) for instructions.
2. `git clone https://github.com/dguastaf/photoframe.git`
3. Create `.env` from the template and set your Photoprism URL and token (from step 1):

   ```bash
   cp .env.example .env
   ```

   See [.env Configuration](#env-configuration) for all variables.

4. Run `docker compose up -d`
5. Open **http://localhost:6389** in browser

### Updates

```bash
docker compose down
git pull
docker compose up -d
```

### Advanced

Dev ports are fixed in [`config/ports.json`](config/ports.json) (API **52525**, client **6389**). For local Vite dev, the API allows the client dev origin for CORS (from that file unless you set `CORS_ORIGINS`). Vite proxies `/api` to the server so fetches can use relative URLs in dev.

### .env Configuration

See `.env.example` for all variables:

| Var | Purpose |
| --- | --- |
| `PHOTO_SOURCE` | Photo backend to use (`photoprism` today; more may follow) |
| `PHOTOPRISM_BASE_URL` | URL/IP of the Photoprism host, e.g. `http://photoprism.local:2342` |
| `PHOTOPRISM_TOKEN` | Bearer token for the Photoprism API |
| `CORS_ORIGINS` | Optional override; when unset, defaults to the client dev origin in `config/ports.json`. Not needed for Docker compose (UI and API share port **6389** on `server`). |

**Photoprism from Docker:** `PHOTOPRISM_BASE_URL` must be reachable from the **server** container. If Photoprism runs on the Docker host, use the host LAN IP (not `http://localhost:...`).

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

Open http://localhost:6389. Start the API on **52525** first (Vite proxies `/api` to that port; see `config/ports.json`):

```bash
cd server
source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 52525 --reload
```

For a single service on **6389** (built UI + API, no Vite), use `docker compose up` from the repo root instead — do not run that alongside `npm run dev` (both use port **6389**).

Client unit tests: `cd client && npm test`. See [client/TESTING.md](client/TESTING.md) for layout (`tests/unit/`, `tests/e2e/`).
