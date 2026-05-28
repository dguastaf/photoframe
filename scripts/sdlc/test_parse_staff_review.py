#!/usr/bin/env python3
"""Tests for parse_staff_review."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

SDLC_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SDLC_DIR))

from parse_staff_review import parse_planning_verdict  # noqa: E402


class ParseStaffReviewTests(unittest.TestCase):
    def test_ship_passes(self) -> None:
        summary = """
## Staff engineer review
**Phase:** planning
### Verdict
Ship
### Required changes
None
"""
        self.assertEqual(parse_planning_verdict(summary), "pass")

    def test_rework_fails(self) -> None:
        summary = """
### Verdict
Rework
### Required changes
1. Add test strategy for swipe hook.
"""
        self.assertEqual(parse_planning_verdict(summary), "fail")

    def test_required_changes_fail_even_with_ship(self) -> None:
        summary = """
### Verdict
Ship with changes
### Required changes
1. Document timer interaction with manual navigation.
"""
        self.assertEqual(parse_planning_verdict(summary), "fail")


if __name__ == "__main__":
    unittest.main()
