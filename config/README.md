# Shared configuration

**`ports.env`** — canonical defaults for `PHOTOFRAME_SERVER_PORT`, `PHOTOFRAME_CLIENT_PORT`, and `PHOTOFRAME_CLIENT_HOST`.

Loaded by:

- Python (`server/app/ports.py` → `Settings`)
- Vite (`config/ports.ts` → `client/vite.config.ts`)
- Docker Compose (`env_file`)

Override in `.env` or the shell; do not duplicate port numbers elsewhere without updating this file.
