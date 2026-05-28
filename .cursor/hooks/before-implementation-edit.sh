#!/usr/bin/env bash
# Blocks agent edits to product/test paths until branch + planning SDLC gates pass.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if result=$(cd "$ROOT" && python3 scripts/sdlc/pre_implementation_gate.py --hook-stdin); then
  printf '%s\n' "$result"
  exit 0
fi

python3 - <<'PY'
import json
print(json.dumps({
    "permission": "deny",
    "user_message": "SDLC pre-implementation gate failed to run (see Hooks output).",
    "agent_message": (
        "Fix scripts/sdlc/pre_implementation_gate.py or the hook environment, then retry. "
        "See scripts/sdlc/README.md."
    ),
}))
PY
