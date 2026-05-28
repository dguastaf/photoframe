#!/usr/bin/env python3
"""Orchestrate planning review: pending branch, auto-checkout, record_phase on pass."""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from parse_staff_review import parse_planning_verdict
from review_path import ROOT, branch_name, branch_slug, review_path
from validate_review import _exception_ok, _phase_ok, load_review

PROTECTED_BRANCHES = frozenset({"main", "master"})
STATE_DIR = ROOT / ".cursor" / "hooks" / "state"
PENDING_FILE = STATE_DIR / "sdlc-pending.json"
BRANCH_RE = re.compile(r"^feature/[a-z0-9][a-z0-9._/-]*$", re.IGNORECASE)


def slugify(text: str) -> str:
    spaced = re.sub(r"([a-z0-9])([A-Z])", r"\1-\2", text)
    slug = re.sub(r"[^a-z0-9]+", "-", spaced.lower()).strip("-")
    return slug or "sdlc-work"


def normalize_branch(name: str) -> str:
    cleaned = name.strip().replace("\\", "/")
    if cleaned.startswith("refs/heads/"):
        cleaned = cleaned.removeprefix("refs/heads/")
    if "/" in cleaned:
        prefix, rest = cleaned.split("/", 1)
        if prefix != "feature":
            cleaned = f"feature/{slugify(cleaned)}"
        else:
            cleaned = f"feature/{slugify(rest)}"
    elif not cleaned.startswith("feature/"):
        cleaned = f"feature/{slugify(cleaned.removeprefix('feature/'))}"
    else:
        cleaned = f"feature/{slugify(cleaned.removeprefix('feature/'))}"
    return cleaned


def propose_branch_name(*, trigger_path: str | None = None, task: str | None = None) -> str:
    env_branch = os.environ.get("PHOTOFRAME_SDLC_BRANCH", "").strip()
    if env_branch:
        return normalize_branch(env_branch)

    if task:
        match = re.search(r"(?:branch|feature/)[:\s]+([^\s`]+)", task, re.IGNORECASE)
        if match:
            return normalize_branch(match.group(1))

    if trigger_path:
        normalized = trigger_path.replace("\\", "/").lstrip("./")
        parts = normalized.split("/")
        if "features" in parts:
            idx = parts.index("features")
            if idx + 1 < len(parts):
                return f"feature/{slugify(parts[idx + 1])}"
        stem = Path(normalized).stem
        if stem.startswith("use") and len(stem) > 3:
            stem = stem[3:]
        return f"feature/{slugify(stem)}"

    try:
        current = branch_name()
        if current not in PROTECTED_BRANCHES:
            return current
    except SystemExit:
        pass
    return "feature/sdlc-work"


def gates_satisfied() -> bool:
    try:
        if branch_name() in PROTECTED_BRANCHES:
            return False
    except SystemExit:
        return False
    data = load_review(review_path())
    if data is None:
        return False
    if _exception_ok(data.get("exception")):
        return True
    phases = data.get("phases")
    if not isinstance(phases, dict):
        return False
    return _phase_ok(phases.get("planning"))


def load_pending() -> dict | None:
    if not PENDING_FILE.is_file():
        return None
    data = json.loads(PENDING_FILE.read_text(encoding="utf-8"))
    return data if isinstance(data, dict) else None


def save_pending(
    *,
    proposed_branch: str,
    trigger_path: str | None = None,
    reason: str = "implementation_blocked",
) -> dict:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "proposed_branch": proposed_branch,
        "trigger_path": trigger_path,
        "reason": reason,
        "at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
    }
    PENDING_FILE.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return payload


def clear_pending() -> None:
    if PENDING_FILE.is_file():
        PENDING_FILE.unlink()


def git_checkout_branch(name: str) -> tuple[bool, str]:
    if not BRANCH_RE.match(name):
        return False, f"invalid branch name {name!r}"
    exists = subprocess.run(
        ["git", "show-ref", "--verify", f"refs/heads/{name}"],
        cwd=ROOT,
        capture_output=True,
        check=False,
    )
    if exists.returncode == 0:
        cmd = ["git", "checkout", name]
    else:
        cmd = ["git", "checkout", "-b", name]
    result = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "git checkout failed").strip()
        return False, detail
    return True, name


def record_planning_outcome(outcome: str, summary: str | None = None) -> Path:
    sdlc_dir = Path(__file__).resolve().parent
    cmd = [sys.executable, str(sdlc_dir / "record_phase.py"), "planning", outcome]
    if summary:
        cmd.append(summary)
    result = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "record_phase failed").strip()
        raise RuntimeError(detail)
    return review_path()


def finalize_planning_after_review(summary: str, *, task: str | None = None) -> dict:
    pending = load_pending() or {}
    proposed = pending.get("proposed_branch")
    if isinstance(proposed, str) and proposed.strip():
        branch = normalize_branch(proposed)
    else:
        branch = propose_branch_name(task=task)

    verdict = parse_planning_verdict(summary)
    if verdict == "fail":
        excerpt = summary.strip()[:500]
        record_planning_outcome("fail", excerpt or "staff-engineer planning review failed")
        return {
            "ok": False,
            "followup_message": (
                "Planning staff-engineer review did not pass. Update the plan to address "
                "**Required changes**, then delegate to the **staff-engineer** subagent again "
                "with `review_phase: planning`."
            ),
            "user_message": "Planning review failed; see follow-up.",
        }

    if verdict != "pass":
        return {
            "ok": False,
            "followup_message": (
                "Could not parse a clear Ship verdict from the staff-engineer summary. "
                "Re-run the **staff-engineer** subagent with `review_phase: planning` and a "
                "clear ### Verdict section."
            ),
            "user_message": "Planning review outcome unclear.",
        }

    try:
        current = branch_name()
    except SystemExit as exc:
        return {
            "ok": False,
            "followup_message": f"Could not resolve git branch: {exc}",
            "user_message": "Git branch error.",
        }

    active_branch = current
    if current in PROTECTED_BRANCHES:
        ok, detail = git_checkout_branch(branch)
        if not ok:
            return {
                "ok": False,
                "followup_message": f"Could not create feature branch: {detail}",
                "user_message": "Branch creation failed.",
            }
        active_branch = branch

    record_planning_outcome("pass")
    clear_pending()
    review_file = review_path()
    return {
        "ok": True,
        "branch": active_branch,
        "review_file": str(review_file.relative_to(ROOT)),
        "followup_message": (
            f"Planning review passed. Active branch `{active_branch}`; "
            f"`{review_file.relative_to(ROOT)}` records planning. "
            "Continue implementation (product and test edits are now allowed)."
        ),
        "user_message": f"Planning gate passed on branch {active_branch}.",
    }


def ensure_pending_for_block(*, trigger_path: str | None) -> str:
    pending = load_pending()
    if pending and isinstance(pending.get("proposed_branch"), str):
        return normalize_branch(pending["proposed_branch"])
    branch = propose_branch_name(trigger_path=trigger_path)
    save_pending(proposed_branch=branch, trigger_path=trigger_path)
    return branch


def block_agent_message(proposed_branch: str) -> str:
    return (
        "SDLC: product/test edits are blocked until planning review passes. "
        "Your **only** next step: delegate to the **staff-engineer** subagent with "
        "`review_phase: planning` and the full final plan (include acceptance criteria and "
        "test strategy). "
        f"On pass, branch `{proposed_branch}` will be created automatically and planning "
        f"will be recorded in `scripts/sdlc/reviews/{branch_slug(proposed_branch)}.json`. "
        "Do not write product/test files or use other subagents until that completes."
    )


def evaluate_task_input(payload: dict) -> dict:
    if gates_satisfied():
        return {"permission": "allow"}

    tool_input = payload.get("tool_input")
    if not isinstance(tool_input, dict):
        return {"permission": "allow"}

    subagent_type = tool_input.get("subagent_type", "")
    if subagent_type == "staff-engineer":
        prompt = tool_input.get("prompt") or tool_input.get("task") or ""
        pending = load_pending()
        branch = (
            pending.get("proposed_branch")
            if pending and isinstance(pending.get("proposed_branch"), str)
            else propose_branch_name(task=str(prompt))
        )
        save_pending(proposed_branch=normalize_branch(branch), reason="staff_engineer_invoked")
        return {"permission": "allow"}

    return {
        "permission": "deny",
        "user_message": "SDLC: run staff-engineer planning review before other subagents.",
        "agent_message": block_agent_message(
            ensure_pending_for_block(trigger_path=None)
        ),
    }


def evaluate_subagent_stop(payload: dict) -> dict:
    if payload.get("subagent_type") != "staff-engineer":
        return {}
    if payload.get("status") != "completed":
        return {
            "followup_message": (
                "Staff-engineer subagent did not complete. Retry planning review or "
                "adjust the plan before implementation."
            )
        }

    summary = payload.get("summary")
    if not isinstance(summary, str):
        summary = ""
    task = payload.get("task")
    task_str = task if isinstance(task, str) else None

    result = finalize_planning_after_review(summary, task=task_str)
    if result.get("ok"):
        return {"followup_message": result["followup_message"]}
    return {"followup_message": result.get("followup_message", "Planning review incomplete.")}
