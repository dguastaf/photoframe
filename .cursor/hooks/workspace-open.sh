#!/usr/bin/env bash
# Creates server/.venv and installs dev deps when the workspace opens.
set -euo pipefail
# Hooks receive JSON on stdin; we use CURSOR_PROJECT_DIR instead.
exec 0</dev/null

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=.cursor/hooks/ensure-server-venv.lib.sh
source "${SCRIPT_DIR}/ensure-server-venv.lib.sh"

if ensure_server_venv; then
    echo "ensure_server_venv: ready at ${PHOTOFRAME_VENV}" >&2
else
    echo "ensure_server_venv: skipped (see errors above)" >&2
fi

exit 0
