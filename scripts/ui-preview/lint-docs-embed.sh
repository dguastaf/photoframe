#!/usr/bin/env bash
# Fails if docs use relative ui-preview image links or repo video links in PR bodies.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
node "${ROOT}/scripts/ui-preview/lint-markdown-embeds.mjs"
