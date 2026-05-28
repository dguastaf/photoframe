#!/usr/bin/env python3
"""Gate product implementation edits: planning review + feature branch (automated).

Used by Cursor hooks:
- preToolUse (Write/StrReplace/EditNotebook): block until planning passes
- preToolUse (Task): only staff-engineer allowed until planning passes
- subagentStop (staff-engineer): create branch + record planning on pass

See scripts/sdlc/README.md and AI-SDLC.md control 1 + 5.
"""

from __future__ import annotations

import argparse
import json
import sys

from changed_paths import is_production_code_path
from planning_orchestrator import (
    block_agent_message,
    ensure_pending_for_block,
    evaluate_subagent_stop,
    evaluate_task_input,
    gates_satisfied,
)
from review_path import review_path
from validate_review import load_review

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


def paths_from_tool_input(tool_name: str, tool_input: object) -> list[str]:
    if not isinstance(tool_input, dict):
        return []
    if tool_name == "EditNotebook":
        notebook = tool_input.get("target_notebook")
        return [notebook] if isinstance(notebook, str) and notebook.strip() else []
    path = tool_input.get("path")
    return [path] if isinstance(path, str) and path.strip() else []


def evaluate_edit_hook_input(payload: dict) -> dict:
    tool_name = payload.get("tool_name", "")
    if tool_name not in IMPLEMENTATION_TOOLS:
        return {"permission": "allow"}

    if gates_satisfied():
        return {"permission": "allow"}

    paths = paths_from_tool_input(tool_name, payload.get("tool_input"))
    if not paths:
        return {"permission": "allow"}

    blocked = [p for p in paths if is_implementation_path(p)]
    if not blocked:
        return {"permission": "allow"}

    proposed = ensure_pending_for_block(trigger_path=blocked[0])
    return {
        "permission": "deny",
        "user_message": (
            f"SDLC: planning review required before editing {blocked[0]!r}. "
            f"Delegate to staff-engineer; branch `{proposed}` will be created on pass."
        ),
        "agent_message": block_agent_message(proposed),
    }


def evaluate_hook_input(payload: dict) -> dict:
    tool_name = payload.get("tool_name", "")
    if tool_name == "Task":
        return evaluate_task_input(payload)
    return evaluate_edit_hook_input(payload)


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
    parser.add_argument(
        "--subagent-stop-stdin",
        action="store_true",
        help="Read subagentStop hook JSON from stdin and print followup JSON",
    )
    args = parser.parse_args()

    if args.hook_stdin:
        payload = json.load(sys.stdin)
        print(json.dumps(evaluate_hook_input(payload)))
        return

    if args.subagent_stop_stdin:
        payload = json.load(sys.stdin)
        print(json.dumps(evaluate_subagent_stop(payload)))
        return

    if not args.paths:
        parser.error("specify --path, --hook-stdin, and/or --subagent-stop-stdin")

    if gates_satisfied():
        print("pre-implementation gate passed", file=sys.stderr)
        return

    review_data = load_review(review_path())
    _ = review_data
    for path in args.paths:
        if is_implementation_path(path):
            for err in ["planning gate not satisfied"]:
                print(f"error: {err}", file=sys.stderr)
            raise SystemExit(1)
    print("pre-implementation gate passed", file=sys.stderr)


if __name__ == "__main__":
    main()
