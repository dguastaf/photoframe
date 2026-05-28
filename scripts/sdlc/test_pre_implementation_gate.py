#!/usr/bin/env python3
"""Unit tests for pre_implementation_gate path classification and planning checks."""

from __future__ import annotations

import json
import subprocess
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

SDLC_DIR = Path(__file__).resolve().parent
ROOT = SDLC_DIR.parents[1]
sys.path.insert(0, str(SDLC_DIR))

from pre_implementation_gate import (  # noqa: E402
    evaluate_hook_input,
    is_exempt_path,
    is_implementation_path,
    validate_branch,
    validate_planning_gate,
)


class PathClassificationTests(unittest.TestCase):
    def test_production_paths_are_implementation(self) -> None:
        self.assertTrue(is_implementation_path("client/src/App.tsx"))
        self.assertTrue(is_implementation_path("server/app/main.py"))

    def test_test_paths_are_implementation(self) -> None:
        self.assertTrue(is_implementation_path("client/tests/unit/App.test.tsx"))

    def test_sdlc_paths_are_exempt(self) -> None:
        self.assertTrue(is_exempt_path("scripts/sdlc/reviews/foo.json"))
        self.assertFalse(is_implementation_path("scripts/sdlc/record_phase.py"))

    def test_cursor_paths_are_exempt(self) -> None:
        self.assertTrue(is_exempt_path(".cursor/hooks.json"))
        self.assertFalse(is_implementation_path(".cursor/rules/foo.mdc"))


class PlanningGateTests(unittest.TestCase):
    def test_missing_review_fails(self) -> None:
        self.assertTrue(validate_planning_gate(None))

    def test_planning_pass_ok(self) -> None:
        data = {
            "phases": {
                "planning": {"outcome": "pass", "at": "2026-01-01T00:00:00Z"},
            },
            "exception": None,
        }
        self.assertEqual(validate_planning_gate(data), [])

    def test_exception_skips_planning(self) -> None:
        data = {
            "phases": {},
            "exception": {
                "reason": "hotfix",
                "scope": "skip",
                "approver": "owner",
                "expires": "2026-12-31",
            },
        }
        self.assertEqual(validate_planning_gate(data), [])


class BranchGateTests(unittest.TestCase):
    @patch("pre_implementation_gate.branch_name", return_value="main")
    def test_main_blocked(self, _mock: object) -> None:
        self.assertTrue(validate_branch())

    @patch("pre_implementation_gate.branch_name", return_value="feature/foo")
    def test_feature_ok(self, _mock: object) -> None:
        self.assertEqual(validate_branch(), [])


class HookInputTests(unittest.TestCase):
    @patch("pre_implementation_gate.branch_name", return_value="feature/foo")
    @patch(
        "pre_implementation_gate.load_review",
        return_value={
            "phases": {
                "planning": {"outcome": "pass", "at": "2026-01-01T00:00:00Z"},
            },
            "exception": None,
        },
    )
    @patch("pre_implementation_gate.review_path")
    def test_allows_when_gates_pass(
        self, _review_path: object, _load: object, _branch: object
    ) -> None:
        out = evaluate_hook_input(
            {
                "tool_name": "Write",
                "tool_input": {"path": "client/src/App.tsx", "contents": "x"},
            }
        )
        self.assertEqual(out["permission"], "allow")

    @patch("pre_implementation_gate.branch_name", return_value="main")
    @patch("pre_implementation_gate.load_review", return_value=None)
    @patch("pre_implementation_gate.review_path")
    def test_denies_on_main(
        self, _review_path: object, _load: object, _branch: object
    ) -> None:
        out = evaluate_hook_input(
            {
                "tool_name": "Write",
                "tool_input": {"path": "client/src/App.tsx", "contents": "x"},
            }
        )
        self.assertEqual(out["permission"], "deny")

    def test_ignores_non_write_tools(self) -> None:
        out = evaluate_hook_input(
            {"tool_name": "Read", "tool_input": {"path": "client/src/App.tsx"}}
        )
        self.assertEqual(out["permission"], "allow")


class CliTests(unittest.TestCase):
    def test_hook_stdin_smoke(self) -> None:
        payload = json.dumps(
            {"tool_name": "Read", "tool_input": {"path": "client/src/App.tsx"}}
        )
        proc = subprocess.run(
            [sys.executable, str(SDLC_DIR / "pre_implementation_gate.py"), "--hook-stdin"],
            input=payload,
            text=True,
            capture_output=True,
            cwd=ROOT,
        )
        self.assertEqual(proc.returncode, 0, proc.stderr)
        data = json.loads(proc.stdout)
        self.assertEqual(data["permission"], "allow")


if __name__ == "__main__":
    unittest.main()
