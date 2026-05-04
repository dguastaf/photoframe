# Photoframe

A simple digital photo frame slideshow application backed by Photoprism.

## Status

**Phase 1: scaffolding only.** The server starts, accepts requests, and returns dummy data. Photoprism is not yet wired up. The client is not yet built.

Treat this API **as unstable** until real backend integration lands—response shapes may change slightly while we shake out Photoprism behavior.

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

# List photos (returns dummy data in Phase 1)
curl http://localhost:52525/api/v0/photos | jq

# Image bytes (returns a placeholder PNG in Phase 1)
curl -o /tmp/photo.png http://localhost:52525/api/v0/photos/p1abc123/image
file /tmp/photo.png
```

All three should respond with HTTP 200.

## Configuration

Only two env vars are required (see `.env.example`):

| Var | Purpose |
| --- | --- |
| `PHOTOPRISM_BASE_URL` | URL/IP of the Photoprism host, e.g. `http://photoprism.local:2342` |
| `PHOTOPRISM_TOKEN` | Bearer token for the Photoprism API |

In Phase 1 these are read by the config layer but not yet used by any route.

## Development

```bash
cd server
pip install -e ".[dev]"
pytest
```

## What's next

- Wire `PhotoprismAdapter` to actually call the Photoprism API.
- Build the React client (`client/`).
- See `.cursor/plans/photoframe_greenfield_build_*.plan.md` for the full plan.
