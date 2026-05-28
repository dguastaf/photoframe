#!/usr/bin/env python3
"""Parse staff-engineer subagent output for planning gate automation."""

from __future__ import annotations

import re
from typing import Literal

Verdict = Literal["pass", "fail", "unclear"]

VERDICT_SECTION = re.compile(
    r"^###\s+Verdict\s*$.*?^\s*(.+?)\s*$",
    re.MULTILINE | re.IGNORECASE | re.DOTALL,
)
REQUIRED_SECTION = re.compile(
    r"^###\s+Required changes\s*$(.*?)(?=^###\s|\Z)",
    re.MULTILINE | re.IGNORECASE | re.DOTALL,
)
FAIL_VERDICT = re.compile(r"\bRework\b", re.IGNORECASE)
PASS_VERDICT = re.compile(r"\bShip(?:\s+with\s+changes)?\b", re.IGNORECASE)
NUMBERED_ITEM = re.compile(r"^\s*\d+\.\s+\S", re.MULTILINE)


def _section_has_actionable_items(section: str) -> bool:
    lines = [ln.strip() for ln in section.splitlines() if ln.strip()]
    if not lines:
        return False
    placeholders = {"none", "n/a", "na", "-", "—", "no required changes."}
    if all(ln.lower().rstrip(".") in placeholders for ln in lines):
        return False
    return bool(NUMBERED_ITEM.search(section)) or any(
        ln.startswith("- ") and ln[2:].strip().lower() not in placeholders for ln in lines
    )


def parse_planning_verdict(summary: str) -> Verdict:
    """Return pass when review approves planning; fail when rework or required changes exist."""
    if not summary or not summary.strip():
        return "unclear"

    text = summary.strip()
    required_match = REQUIRED_SECTION.search(text)
    if required_match and _section_has_actionable_items(required_match.group(1)):
        return "fail"

    verdict_line = ""
    verdict_match = VERDICT_SECTION.search(text)
    if verdict_match:
        verdict_line = verdict_match.group(1).strip()
    elif FAIL_VERDICT.search(text):
        return "fail"
    elif pass_match := PASS_VERDICT.search(text):
        verdict_line = pass_match.group(0)

    if verdict_line and FAIL_VERDICT.search(verdict_line):
        return "fail"
    if verdict_line and PASS_VERDICT.search(verdict_line):
        return "pass"
    if FAIL_VERDICT.search(text):
        return "fail"
    if PASS_VERDICT.search(text):
        return "pass"
    return "unclear"
