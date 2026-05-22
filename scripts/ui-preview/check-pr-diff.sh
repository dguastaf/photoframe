#!/usr/bin/env bash
# Fails when a PR branch changes UI files but not ui-preview assets vs base ref.
set -euo pipefail

BASE_REF="${1:-origin/main}"
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

# shellcheck source=scripts/ui-preview/ui-paths.sh
source "${ROOT}/scripts/ui-preview/ui-paths.sh"

if ! git rev-parse --verify "${BASE_REF}" >/dev/null 2>&1; then
  echo "warning: base ref ${BASE_REF} not found; skipping ui-preview PR check"
  exit 0
fi

UI_CHANGED=()
while IFS= read -r f; do
  case "$f" in
    *.test.* | *.spec.* | */test/* | */tests/*) ;;
    *) UI_CHANGED+=("$f") ;;
  esac
done < <(git diff --name-only "${BASE_REF}...HEAD" -- "${UI_PATH_PATTERNS[@]}" 2>/dev/null || true)

# Deletions of unused assets, dead modules, or type-only files do not change the rendered UI.
VISUAL_UI=()
for f in "${UI_CHANGED[@]}"; do
  case "$f" in
    client/src/assets/* | client/src/features/health/* | client/src/types/*) continue ;;
  esac
  VISUAL_UI+=("$f")
done
if ((${#VISUAL_UI[@]} > 0)); then
  UI_CHANGED=("${VISUAL_UI[@]}")
else
  UI_CHANGED=()
fi

if ((${#UI_CHANGED[@]} == 0)); then
  exit 0
fi

mapfile -t PREVIEW_CHANGED < <(git diff --name-only "${BASE_REF}...HEAD" -- "${UI_PREVIEW_DIR}/" 2>/dev/null || true)
ASSET_CHANGED=()
for f in "${PREVIEW_CHANGED[@]}"; do
  case "$f" in
    "${UI_PREVIEW_DIR}/manifest.json" | "${UI_PREVIEW_DIR}/README.md") ;;
    "${UI_PREVIEW_DIR}/"*) ASSET_CHANGED+=("$f") ;;
  esac
done

has_preview_asset() {
  local f
  for f in "${UI_PREVIEW_DIR}/app-shell.png" "${UI_PREVIEW_DIR}/app-flow.webm"; do
    [[ -f "$f" && -s "$f" ]] && return 0
  done
  return 1
}

if ((${#ASSET_CHANGED[@]} == 0)); then
  if has_preview_asset; then
    echo "error: PR changes UI files but does not update ${UI_PREVIEW_DIR}/ screenshots or videos." >&2
  else
    echo "error: PR changes UI files but ${UI_PREVIEW_DIR}/ has no screenshot or video." >&2
  fi
  echo "" >&2
  echo "UI files changed:" >&2
  printf '  - %s\n' "${UI_CHANGED[@]}" >&2
  echo "" >&2
  echo "Before opening the PR, run capture on this branch and commit the assets (any commit on the branch is fine):" >&2
  echo "  cd client && npm run ui:screenshot" >&2
  echo "  cd client && npm run ui:preview   # preferred: screenshot + video + validate" >&2
  exit 1
fi

node "${ROOT}/scripts/ui-preview/validate.mjs" --require all

"${ROOT}/scripts/ui-preview/lint-docs-embed.sh"

echo ""
echo "PR description embed (paste into PR — screenshot must use raw.githubusercontent.com):"
node "${ROOT}/scripts/ui-preview/pr-embed.mjs" || true

exit 0
