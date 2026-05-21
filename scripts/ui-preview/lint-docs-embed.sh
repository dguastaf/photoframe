#!/usr/bin/env bash
# Fails if docs use relative .github/ui-preview/ markdown image links (broken in PR bodies).
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

# Markdown images only — plain links to .github/ui-preview/README.md are OK.
PATTERN='!\[[^]]*\]\(\.github/ui-preview/'

if command -v rg >/dev/null 2>&1; then
  MATCHES=$(rg -n "$PATTERN" --glob '*.md' --glob '*.mdc' . 2>/dev/null || true)
else
  MATCHES=$(grep -RIn --include='*.md' --include='*.mdc' -E "$PATTERN" . 2>/dev/null || true)
fi

if [[ -n "$MATCHES" ]]; then
  echo "error: PR screenshot embeds must use raw.githubusercontent.com, not relative paths." >&2
  echo "" >&2
  echo "$MATCHES" >&2
  echo "" >&2
  echo "Fix docs to use the template in .github/ui-preview/README.md" >&2
  echo "Generate a correct block: cd client && npm run ui:embed" >&2
  exit 1
fi

exit 0
