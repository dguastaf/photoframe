#!/usr/bin/env python3
"""Post SDLC phase verdicts as GitHub commit statuses on the current HEAD.

Phase verdicts are the merge gate. They live as commit statuses (not a committed
file), so nothing lands on `main` and there is nothing to clean up after merge.
This is best-effort: if `gh` is missing, unauthenticated, offline, or HEAD is not
yet pushed, it warns and returns without failing the caller. CI re-asserts the
latest verdict for each context on every push (see .github/workflows/ci.yml).
"""

from __future__ import annotations

import subprocess
import sys

from review_path import ROOT

# Phase name -> commit status context. Only these gate the merge; walkthrough /
# pre_pr are optional audit phases and are intentionally not posted.
PHASE_CONTEXT = {
    "planning": "sdlc/planning",
    "implementation": "sdlc/implementation",
    "code_review": "sdlc/code-review",
}

# Outcome -> commit status state. `exception` is an owner-approved skip, so it
# counts as passing for the gate (the reason rides along in the description).
OUTCOME_STATE = {
    "pass": "success",
    "exception": "success",
    "fail": "failure",
}


def _head_sha() -> str | None:
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    sha = (result.stdout or "").strip()
    return sha or None


def post_phase_statuses(phases: dict) -> None:
    """Post a commit status for each gated phase recorded in `phases`."""
    sha = _head_sha()
    if not sha:
        print("sdlc: could not resolve HEAD sha; skipping status post", file=sys.stderr)
        return

    for phase, ctx in PHASE_CONTEXT.items():
        entry = phases.get(phase)
        if not isinstance(entry, dict):
            continue
        state = OUTCOME_STATE.get(entry.get("outcome"))
        if state is None:
            continue
        summary = (entry.get("summary") or "").strip()
        description = summary[:140] if summary else (
            "passed" if state == "success" else "not passing"
        )
        result = subprocess.run(
            [
                "gh", "api", "--method", "POST",
                f"repos/{{owner}}/{{repo}}/statuses/{sha}",
                "-f", f"state={state}",
                "-f", f"context={ctx}",
                "-f", f"description={description}",
            ],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            print(
                f"sdlc: could not post {ctx} status (HEAD pushed? gh authed?): "
                f"{result.stderr.strip()}",
                file=sys.stderr,
            )
        else:
            print(f"sdlc: posted {ctx}={state} on {sha[:8]}", file=sys.stderr)
