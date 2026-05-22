#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
chmod +x scripts/ui-preview/*.sh
echo "UI preview scripts are executable. PR CI enforces preview assets when UI changes."
