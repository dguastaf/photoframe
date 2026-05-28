#!/usr/bin/env bash
# On staff-engineer completion: create feature branch + record planning when review passes.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if result=$(cd "$ROOT" && python3 scripts/sdlc/pre_implementation_gate.py --subagent-stop-stdin); then
  printf '%s\n' "$result"
  exit 0
fi

printf '{}\n'
