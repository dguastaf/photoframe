#!/usr/bin/env bash
# Start the Photoframe API for local client dev (Vite on 6389 proxies /api here).
set -euo pipefail

SERVER_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="$(cd "$SERVER_ROOT/.." && pwd)"
VENV_ACTIVATE="$SERVER_ROOT/.venv/bin/activate"
ENV_FILE="$REPO_ROOT/.env"
PORTS_JSON="$REPO_ROOT/config/ports.json"

cd "$SERVER_ROOT"

if [[ ! -f "$VENV_ACTIVATE" ]]; then
  echo "error: $SERVER_ROOT/.venv not found" >&2
  echo "  python3 -m venv .venv && source .venv/bin/activate && pip install -e '.[dev]'" >&2
  exit 1
fi

# shellcheck source=/dev/null
source "$VENV_ACTIVATE"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  set +a
else
  echo "warning: $ENV_FILE not found — copy .env.example and set Photoprism credentials" >&2
fi

if ! SERVER_PORT="$(python3 -c "import json; print(json.load(open('$PORTS_JSON'))['serverPort'])")"; then
  echo "error: could not read serverPort from $PORTS_JSON" >&2
  exit 1
fi

if ! python3 -c "from app.config import settings; settings.photoprism_token" 2>/dev/null; then
  echo "error: failed to load config — create $ENV_FILE from .env.example" >&2
  exit 1
fi

CLIENT_PORT="$(python3 -c "import json; print(json.load(open('$PORTS_JSON'))['clientDevPort'])")"

echo "Starting Photoframe API at http://127.0.0.1:${SERVER_PORT}"
echo "Client dev: cd client && npm run dev  →  http://localhost:${CLIENT_PORT}"
exec python3 -m uvicorn app.main:app --host 127.0.0.1 --port "$SERVER_PORT" --reload
