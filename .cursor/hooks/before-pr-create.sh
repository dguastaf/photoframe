#!/usr/bin/env bash
# Blocks gh pr create until SDLC review phases are recorded (see AI-SDLC.md).
set -euo pipefail

input=$(cat)
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

command=$(printf '%s' "$input" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(data.get('command', ''))
" 2>/dev/null || echo "")

if [[ ! "$command" =~ gh[[:space:]]+pr[[:space:]]+create ]]; then
  echo '{"permission":"allow"}'
  exit 0
fi

if (cd "$ROOT" && python3 scripts/sdlc/validate_review.py --for-pr-create) >&2; then
  echo '{"permission":"allow"}'
  exit 0
fi

python3 - <<'PY'
import json
print(json.dumps({
    "permission": "deny",
    "user_message": (
        "PR creation blocked: SDLC staff-engineer phases are not recorded. "
        "Complete planning and implementation reviews (or document an approved exception), "
        "then run: python3 scripts/sdlc/record_phase.py <phase> pass"
    ),
    "agent_message": (
        "Record planning and implementation with scripts/sdlc/record_phase.py (pass needs no summary), "
        "commit scripts/sdlc/reviews/<branch-slug>.json, then retry gh pr create. See scripts/sdlc/README.md."
    ),
}))
PY
