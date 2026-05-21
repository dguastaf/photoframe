#!/usr/bin/env bash
# Fails if staged UI files are not accompanied by updated ui-preview assets.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

# shellcheck source=scripts/ui-preview/ui-paths.sh
source "${ROOT}/scripts/ui-preview/ui-paths.sh"

STAGED_UI=()
while IFS= read -r -d '' f; do
  case "$f" in
    *.test.* | *.spec.* | */test/* | */tests/*) ;;
    *) STAGED_UI+=("$f") ;;
  esac
done < <(git diff --cached --name-only -z -- "${UI_PATH_PATTERNS[@]}" 2>/dev/null || true)

if ((${#STAGED_UI[@]} == 0)); then
  exit 0
fi

STAGED_PREVIEW=()
while IFS= read -r -d '' f; do
  STAGED_PREVIEW+=("$f")
done < <(git diff --cached --name-only -z -- "${UI_PREVIEW_DIR}/" 2>/dev/null || true)

# Ignore manifest-only updates; require a visual asset change.
STAGED_ASSETS=()
if ((${#STAGED_PREVIEW[@]} > 0)); then
for f in "${STAGED_PREVIEW[@]}"; do
  case "$f" in
    "${UI_PREVIEW_DIR}/manifest.json" | "${UI_PREVIEW_DIR}/README.md") ;;
    "${UI_PREVIEW_DIR}/"*) STAGED_ASSETS+=("$f") ;;
  esac
done
fi

if ((${#STAGED_ASSETS[@]} == 0)); then
  echo "error: UI files are staged but no ui-preview screenshot/video was updated." >&2
  echo "" >&2
  echo "Staged UI files:" >&2
  printf '  - %s\n' "${STAGED_UI[@]}" >&2
  echo "" >&2
  echo "Recreate assets, then stage them:" >&2
  echo "  cd client && npm run ui:screenshot   # small visual tweaks" >&2
  echo "  cd client && npm run ui:video        # interactions / flows" >&2
  echo "  git add ${UI_PREVIEW_DIR}/" >&2
  exit 1
fi

exit 0
