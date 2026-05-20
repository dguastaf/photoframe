#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit
chmod +x scripts/ui-preview/*.sh
echo "Git hooks path set to .githooks (ui-preview pre-commit active)"
