#!/usr/bin/env bash
# Fails if docs use relative .github/ui-preview/ markdown image links (broken in PR bodies).
# Ignores the same pattern inside `backticks` (anti-pattern examples in docs).
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

python3 <<'PY'
import re
import sys
from pathlib import Path

root = Path(".")
img = re.compile(r"!\[[^]]*\]\(\.github/ui-preview/")
errors: list[str] = []

def scan(path: Path) -> None:
    if "node_modules" in path.parts:
        return
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError:
        return
    for num, line in enumerate(lines, 1):
        without_code = re.sub(r"`[^`]*`", "", line)
        if img.search(without_code):
            errors.append(f"./{path.as_posix()}:{num}:{line}")

for pattern in ("*.md", "*.mdc"):
    for path in sorted(root.rglob(pattern)):
        scan(path)

if errors:
    print(
        "error: PR screenshot embeds must use raw.githubusercontent.com, not relative paths.",
        file=sys.stderr,
    )
    print("", file=sys.stderr)
    for err in errors:
        print(err, file=sys.stderr)
    print("", file=sys.stderr)
    print(
        "Fix docs to use the template in .github/ui-preview/README.md",
        file=sys.stderr,
    )
    print("Generate a correct block: cd client && npm run ui:embed", file=sys.stderr)
    sys.exit(1)
PY
