#!/usr/bin/env python3
"""Validate scripts/sdlc/reviews/<branch>.json and PR test plan for PR gates.

Enforces planning + implementation phase records (or valid exception).
Does not enforce walkthrough, pre_pr, or PR Exceptions section content.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

from review_path import REVIEWS_DIR, branch_slug, review_path

REQUIRED_PHASES = ("planning", "implementation")
EXCEPTION_KEYS = ("reason", "scope", "approver", "expires")
PLACEHOLDER_TEST_PLAN = re.compile(
    r"^\s*(<!--.*?-->|how you verified|tbd|todo|n/?a\.?|-\s*\[\s*\])\s*$",
    re.IGNORECASE | re.DOTALL,
)


def _phase_ok(phase: dict | None) -> bool:
    if not isinstance(phase, dict) or phase.get("outcome") != "pass":
        return False
    return True


def _phase_summary_errors(name: str, phase: dict | None) -> list[str]:
    errors: list[str] = []
    if not isinstance(phase, dict):
        return errors
    outcome = phase.get("outcome")
    summary = phase.get("summary")
    has_summary = isinstance(summary, str) and summary.strip()
    if outcome in ("fail", "exception") and not has_summary:
        errors.append(f"phase {name}: summary required when outcome is {outcome!r}")
    return errors


def _exception_ok(exc: object) -> bool:
    if not isinstance(exc, dict):
        return False
    return all(isinstance(exc.get(k), str) and exc[k].strip() for k in EXCEPTION_KEYS)


def load_review(path: Path) -> dict | None:
    if not path.is_file():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise SystemExit(f"error: {path} must contain a JSON object")
    return data


def validate_review(data: dict | None, *, for_pr: bool) -> list[str]:
    errors: list[str] = []
    if data is None:
        errors.append("missing review file (run staff-engineer phases and record_phase.py)")
        return errors

    exc = data.get("exception")
    if exc is not None and not _exception_ok(exc):
        errors.append(
            "exception must include non-empty reason, scope, approver, and expires"
        )

    phases = data.get("phases")
    if not isinstance(phases, dict):
        errors.append("phases must be an object")
        return errors

    required = () if _exception_ok(exc) else REQUIRED_PHASES
    for name in required:
        phase = phases.get(name)
        if not _phase_ok(phase):
            outcome = phase.get("outcome") if isinstance(phase, dict) else "missing"
            errors.append(f"phase {name}: need outcome=pass (got {outcome!r})")
        errors.extend(_phase_summary_errors(name, phase))

    return errors


def validate_pr_body(body: str) -> list[str]:
    errors: list[str] = []
    if not re.search(r"^##\s+Test\s+plan\s*$", body, re.MULTILINE | re.IGNORECASE):
        errors.append("PR body missing ## Test plan section")
        return errors

    match = re.search(
        r"^##\s+Test\s+plan\s*$(.*?)(?=^##\s|\Z)",
        body,
        re.MULTILINE | re.IGNORECASE | re.DOTALL,
    )
    section = (match.group(1) if match else "").strip()
    lines = [ln.strip() for ln in section.splitlines() if ln.strip()]
    if not lines:
        errors.append("## Test plan section is empty")
        return errors

    substantive = [
        ln
        for ln in lines
        if not PLACEHOLDER_TEST_PLAN.match(ln)
        and not re.match(r"^-\s*\[\s*\]\s*$", ln)
    ]
    if not substantive:
        errors.append("## Test plan has no substantive verification steps")
    return errors


def find_review_for_branch(branch: str) -> Path:
    return REVIEWS_DIR / f"{branch_slug(branch)}.json"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--for-pr-create",
        action="store_true",
        help="Validate current branch review file before gh pr create",
    )
    parser.add_argument(
        "--ci",
        action="store_true",
        help="CI mode: validate review file and optional PR body file",
    )
    parser.add_argument(
        "--branch",
        help="Branch name (default: current branch; CI sets HEAD ref)",
    )
    parser.add_argument(
        "--pr-body-file",
        type=Path,
        help="PR description markdown file for test-plan validation",
    )
    args = parser.parse_args()

    if not args.for_pr_create and not args.ci:
        parser.error("specify --for-pr-create and/or --ci")

    errors: list[str] = []
    data: dict | None = None
    if args.for_pr_create or args.ci:
        path = (
            find_review_for_branch(args.branch)
            if args.branch
            else review_path()
        )
        data = load_review(path)
        errors.extend(validate_review(data, for_pr=args.for_pr_create or args.ci))

    if args.ci and args.pr_body_file:
        body = args.pr_body_file.read_text(encoding="utf-8")
        errors.extend(validate_pr_body(body))

    if errors:
        for err in errors:
            print(f"error: {err}", file=sys.stderr)
        raise SystemExit(1)

    print("sdlc review validation passed")


if __name__ == "__main__":
    main()
