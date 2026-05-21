#!/usr/bin/env bash
# Shared UI path patterns for preview enforcement (git + CI).
UI_PREVIEW_DIR=".github/ui-preview"
UI_PATH_PATTERNS=(
  'client/src/**'
  'client/index.html'
  'client/public/**'
  'client/*.html'
)
