#!/usr/bin/env python3
"""Unit tests for validate_review phase/exception logic."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

SDLC_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SDLC_DIR))

from validate_review import validate_review  # noqa: E402

PASS = {"outcome": "pass", "at": "2026-06-30T00:00:00Z"}
VALID_EXCEPTION = {
    "reason": "Emergency hotfix",
    "scope": "Skip planning artifact",
    "approver": "owner-handle",
    "expires": "2026-07-15",
}


class ValidateReviewTests(unittest.TestCase):
    def test_missing_review_errors(self) -> None:
        self.assertEqual(
            validate_review(None),
            ["missing review file (run staff-engineer phases and record_phase.py)"],
        )

    def test_all_phases_pass_no_errors(self) -> None:
        data = {
            "phases": {
                "planning": PASS,
                "implementation": PASS,
                "code_review": PASS,
            }
        }
        self.assertEqual(validate_review(data), [])

    def test_missing_planning_without_exception_errors(self) -> None:
        data = {"phases": {"implementation": PASS, "code_review": PASS}}
        errors = validate_review(data)
        self.assertTrue(any("phase planning" in e for e in errors))

    def test_planning_exception_waives_only_planning(self) -> None:
        data = {
            "phases": {"implementation": PASS, "code_review": PASS},
            "planning_exception": VALID_EXCEPTION,
        }
        self.assertEqual(validate_review(data), [])

    def test_planning_exception_does_not_waive_implementation(self) -> None:
        data = {
            "phases": {"code_review": PASS},
            "planning_exception": VALID_EXCEPTION,
        }
        errors = validate_review(data)
        self.assertTrue(any("phase implementation" in e for e in errors))

    def test_planning_exception_does_not_waive_code_review(self) -> None:
        data = {
            "phases": {"implementation": PASS},
            "planning_exception": VALID_EXCEPTION,
        }
        errors = validate_review(data)
        self.assertTrue(any("phase code_review" in e for e in errors))

    def test_invalid_planning_exception_errors(self) -> None:
        data = {
            "phases": {"implementation": PASS, "code_review": PASS},
            "planning_exception": {"reason": "missing other fields"},
        }
        errors = validate_review(data)
        self.assertTrue(any("planning_exception must include" in e for e in errors))

    def test_full_exception_still_waives_all_phases(self) -> None:
        data = {"phases": {}, "exception": VALID_EXCEPTION}
        self.assertEqual(validate_review(data), [])


if __name__ == "__main__":
    unittest.main()
