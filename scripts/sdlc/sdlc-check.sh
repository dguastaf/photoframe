#!/usr/bin/env bash
# Local helper: optional touched-area tests + PR gate validation (planning + implementation).
# CI runs full test suite on PR; hook/CI gate does not require walkthrough or pre_pr records.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SDLC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

BASE_REF="${1:-origin/main}"
if ! git rev-parse --verify "${BASE_REF}" >/dev/null 2>&1; then
  BASE_REF="main"
fi

if git diff --name-only "${BASE_REF}...HEAD" -- server/ 2>/dev/null | grep -q .; then
  echo "==> server pytest"
  (cd server && pytest)
else
  echo "==> skip server pytest (no server changes vs ${BASE_REF})"
fi

if git diff --name-only "${BASE_REF}...HEAD" -- client/ 2>/dev/null | grep -q .; then
  echo "==> client unit tests"
  (cd client && npm test)
else
  echo "==> skip client npm test (no client changes vs ${BASE_REF})"
fi

echo "==> SDLC review artifact"
python3 "${SDLC_DIR}/validate_review.py" --for-pr-create

echo "sdlc-check: ok"
