#!/usr/bin/env bash
# Ensures server/.venv exists and puts it on PATH for the agent session.
set -euo pipefail
exec 0</dev/null

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=.cursor/hooks/ensure-server-venv.lib.sh
source "${SCRIPT_DIR}/ensure-server-venv.lib.sh"

if ! ensure_server_venv; then
    exit 0
fi

"${PHOTOFRAME_VENV_BIN}/python" - <<'PY'
import json
import os

venv = os.environ["PHOTOFRAME_VENV"]
server = os.environ["PHOTOFRAME_SERVER_DIR"]
venv_bin = os.environ["PHOTOFRAME_VENV_BIN"]
path = f"{venv_bin}:{os.environ.get('PATH', '')}"

print(
    json.dumps(
        {
            "env": {
                "VIRTUAL_ENV": venv,
                "PATH": path,
            },
            "additional_context": (
                f"Python dev environment is ready at {venv}. "
                f"pytest and pip are on PATH for this session. "
                f"Run tests from {server} with: cd server && pytest. "
                f"SDLC: AI-SDLC.md. Product/test edits blocked until staff-engineer planning review passes; "
                f"hooks then create the feature branch and record planning automatically. "
                f"Before gh pr create: planning + implementation in scripts/sdlc/reviews/. "
                f"See scripts/sdlc/README.md."
            ),
        }
    )
)
PY
