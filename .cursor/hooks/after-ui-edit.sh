#!/usr/bin/env bash
# Reminds the agent to refresh ui-preview assets after UI file edits.
set -euo pipefail
input=$(cat)

file_path=$(echo "$input" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(data.get('file_path', ''))
" 2>/dev/null || echo "")

case "$file_path" in
  client/src/* | client/index.html | client/public/*)
    ;;
  *)
    exit 0
    ;;
esac

python3 - <<'PY'
import json
print(json.dumps({
    "additional_context": (
        "UI file edited. Before opening the PR: `cd client && npm run ui:preview` (not "
        "ui:video alone), commit assets under `.github/ui-preview/` on the branch. "
        "Then `npm run ui:embed` and paste that block into the PR description. "
        "Never use ![...](.github/ui-preview/app-shell.png) — CI enforces preview "
        "on pull requests; individual commits do not need the assets."
    )
}))
PY
