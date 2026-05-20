#!/usr/bin/env bash
# Shared UI path patterns for preview enforcement (git + CI).
UI_PREVIEW_DIR=".github/ui-preview"
UI_PATH_PATTERNS=(
  'client/src/**'
  'client/index.html'
  'client/public/**'
  'client/*.html'
)

ui_preview_paths() {
  printf '%s\n' "${UI_PREVIEW_DIR}/"*
}

is_ui_file() {
  local path="$1"
  case "$path" in
    client/src/* | client/index.html | client/public/*)
      return 0
      ;;
    client/*.html)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}
