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
        "UI file edited. Before committing, refresh PR preview assets under "
        ".github/ui-preview/: run `cd client && npm run ui:preview` (not ui:video alone) "
        "before commit — validates screenshot + slideshow flow video. Stage "
        ".github/ui-preview/ in the same commit; pre-commit rejects tiny/broken webm."
    )
}))
PY
