# Shared configuration

**`ports.json`** — fixed dev ports for the API and Vite client. Imported by `config/ports.ts` (client) and `server/app/ports.py` (server/tests).

**`api-paths.ts`** — versioned HTTP paths for the Photoframe API contract (`/api/v0/...`). Imported by the client; keep in sync with server routes and `README.md`.

Not user-configurable yet; change values here when needed.
