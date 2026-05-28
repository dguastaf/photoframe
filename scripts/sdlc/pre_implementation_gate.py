#!/usr/bin/env python3
"""Gate product implementation edits: feature branch + planning staff-engineer pass.

Used by the Cursor preToolUse hook before Write/StrReplace/EditNotebook on
implementation paths. See scripts/sdlc/README.md and AI-SDLC.md control 1 + 5.
"""

from __future__ import annotations

import argparse
import json
import sys

from changed_paths import is_production_code_path
from review_path import branch_name, review_path
from validate_review import _exception_ok, _phase_ok, load_review

PROTECTED_BRANCHES = frozenset({"main", "master"})

# Paths that may be edited while recording SDLC artifacts (no planning gate).
EXEMPT_PREFIXES = (
    "scripts/sdlc/",
    ".cursor/",
)

# Test paths require the same gates as production code.
TEST_PREFIXES = (
    "server/tests/",
    "client/tests/",
)

IMPLEMENTATION_TOOLS = frozenset({"Write", "StrReplace", "EditNotebook"})


def normalize_path(path: str) -> str:
    normalized = path.replace("\\", "/")
    while normalized.startswith("./"):
        normalized = normalized[2:]
    return normalized


def is_exempt_path(path: str) -> bool:
    normalized = normalize_path(path)
    return any(normalized.startswith(prefix) for prefix in EXEMPT_PREFIXES)


def is_implementation_path(path: str) -> bool:
    normalized = normalize_path(path)
    if is_exempt_path(normalized):
        return False
    if is_production_code_path(normalized):
        return True
    return any(normalized.startswith(prefix) for prefix in TEST_PREFIXES)


def validate_branch() -> list[str]:
    try:
        branch = branch_name()
    except SystemExit:
        return ["not on a git branch (detached HEAD?) — create a feature branch first"]
    if branch in PROTECTED_BRANCHES:
        return [
            f"on protected branch {branch!r} — create a feature branch "
            f"(e.g. git checkout -b feature/my-work) before editing product code"
        ]
    return []


def validate_planning_gate(data: dict | None) -> list[str]:
    if data is None:
        return [
            "planning staff-engineer review not recorded — run staff-engineer on the "
            "final plan, address findings, then: python3 scripts/sdlc/record_phase.py planning pass"
        ]
    exc = data.get("exception")
    if _exception_ok(exc):
        return []
    phases = data.get("phases")
    if not isinstance(phases, dict):
        return ["review file phases must be an object"]
    planning = phases.get("planning")
    if not _phase_ok(planning):
        outcome = planning.get("outcome") if isinstance(planning, dict) else "missing"
        return [
            f"planning phase must be outcome=pass before implementation edits (got {outcome!r})"
        ]
    return []


def check_path(path: str, *, review_data: dict | None) -> list[str]:
    if not is_implementation_path(path):
        return []
    errors: list[str] = []
    errors.extend(validate_branch())
    errors.extend(validate_planning_gate(review_data))
    return errors


def paths_from_tool_input(tool_name: str, tool_input: object) -> list[str]:
    if not isinstance(tool_input, dict):
        return []
    if tool_name == "EditNotebook":
        notebook = tool_input.get("target_notebook")
        return [notebook] if isinstance(notebook, str) and notebook.strip() else []
    path = tool_input.get("path")
    return [path] if isinstance(path, str) and path.strip() else []


def evaluate_hook_input(payload: dict) -> dict:
    tool_name = payload.get("tool_name", "")
    if tool_name not in IMPLEMENTATION_TOOLS:
        return {"permission": "allow"}

    paths = paths_from_tool_input(tool_name, payload.get("tool_input"))
    if not paths:
        return {"permission": "allow"}

    review_data = load_review(review_path())

    errors: list[str] = []
    for path in paths:
        errors.extend(check_path(path, review_data=review_data))

    if not errors:
        return {"permission": "allow"}

    detail = "; ".join(dict.fromkeys(errors))
    return {
        "permission": "deny",
        "user_message": f"SDLC gate: {detail}",
        "agent_message": (
            "Blocked before implementation: (1) work on a feature branch, not main; "
            "(2) run staff-engineer on the final plan, then "
            "python3 scripts/sdlc/record_phase.py planning pass and commit "
            "scripts/sdlc/reviews/<branch-slug>.json. See AI-SDLC.md and scripts/sdlc/README.md."
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--path",
        action="append",
        dest="paths",
        metavar="PATH",
        help="Check a single path (repeatable); for tests and manual checks",
    )
    parser.add_argument(
        "--hook-stdin",
        action="store_true",
        help="Read preToolUse hook JSON from stdin and print permission JSON",
    )
    args = parser.parse_args()

    if args.hook_stdin:
        payload = json.load(sys.stdin)
        print(json.dumps(evaluate_hook_input(payload)))
        return

    if not args.paths:
        parser.error("specify --path and/or --hook-stdin")

    review_data = load_review(review_path())
    all_errors: list[str] = []
    for path in args.paths:
        all_errors.extend(check_path(path, review_data=review_data))

    if all_errors:
        for err in dict.fromkeys(all_errors):
            print(f"error: {err}", file=sys.stderr)
        raise SystemExit(1)
    print("pre-implementation gate passed", file=sys.stderr)


if __name__ == "__main__":
    main()
