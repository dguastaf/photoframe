#!/usr/bin/env python3
"""Tests for planning_orchestrator."""

from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

SDLC_DIR = Path(__file__).resolve().parent
ROOT = SDLC_DIR.parents[1]
sys.path.insert(0, str(SDLC_DIR))

from planning_orchestrator import (  # noqa: E402
    PENDING_FILE,
    clear_pending,
    evaluate_subagent_stop,
    finalize_planning_after_review,
    propose_branch_name,
    save_pending,
)
from pre_implementation_gate import evaluate_edit_hook_input, evaluate_hook_input  # noqa: E402


class ProposeBranchTests(unittest.TestCase):
    def test_from_feature_path(self) -> None:
        branch = propose_branch_name(
            trigger_path="client/src/features/photos/hooks/useManualNavigation.ts"
        )
        self.assertEqual(branch, "feature/photos")

    def test_from_hook_name(self) -> None:
        branch = propose_branch_name(trigger_path="client/src/useFooBar.ts")
        self.assertEqual(branch, "feature/foo-bar")


class OrchestratorTests(unittest.TestCase):
    def setUp(self) -> None:
        clear_pending()

    def tearDown(self) -> None:
        clear_pending()

    @patch("planning_orchestrator.branch_name", return_value="main")
    @patch("planning_orchestrator.git_checkout_branch", return_value=(True, "feature/photos"))
    @patch("planning_orchestrator.record_planning_outcome")
    def test_finalize_pass_on_main_creates_branch(
        self,
        mock_record: object,
        mock_checkout: object,
        _branch: object,
    ) -> None:
        save_pending(proposed_branch="feature/photos")
        summary = "### Verdict\nShip\n### Required changes\nNone\n"
        result = finalize_planning_after_review(summary)
        self.assertTrue(result["ok"])
        mock_checkout.assert_called_once()
        mock_record.assert_called_once_with("pass")
        self.assertFalse(PENDING_FILE.exists())

    @patch("planning_orchestrator.branch_name", return_value="main")
    @patch("planning_orchestrator.record_planning_outcome")
    def test_finalize_fail_records_fail(
        self,
        mock_record: object,
        _branch: object,
    ) -> None:
        summary = "### Verdict\nRework\n### Required changes\n1. Fix plan.\n"
        result = finalize_planning_after_review(summary)
        self.assertFalse(result["ok"])
        mock_record.assert_called_once()
        self.assertEqual(mock_record.call_args[0][0], "fail")


class HookIntegrationTests(unittest.TestCase):
    @patch("planning_orchestrator.gates_satisfied", return_value=False)
    def test_edit_denied_with_staff_engineer_instructions(self, _gates: object) -> None:
        out = evaluate_edit_hook_input(
            {
                "tool_name": "Write",
                "tool_input": {"path": "client/src/App.tsx", "contents": "x"},
            }
        )
        self.assertEqual(out["permission"], "deny")
        self.assertIn("staff-engineer", out["agent_message"])

    @patch("planning_orchestrator.gates_satisfied", return_value=False)
    def test_task_staff_engineer_allowed(self, _gates: object) -> None:
        out = evaluate_hook_input(
            {
                "tool_name": "Task",
                "tool_input": {
                    "subagent_type": "staff-engineer",
                    "prompt": "review_phase: planning\n\nPlan text",
                },
            }
        )
        self.assertEqual(out["permission"], "allow")
        pending = json.loads(PENDING_FILE.read_text(encoding="utf-8"))
        self.assertIn("proposed_branch", pending)

    @patch("planning_orchestrator.gates_satisfied", return_value=False)
    def test_task_other_subagent_denied(self, _gates: object) -> None:
        out = evaluate_hook_input(
            {
                "tool_name": "Task",
                "tool_input": {
                    "subagent_type": "generalPurpose",
                    "prompt": "implement the feature",
                },
            }
        )
        self.assertEqual(out["permission"], "deny")

    @patch("planning_orchestrator.finalize_planning_after_review")
    @patch("planning_orchestrator.gates_satisfied", return_value=True)
    def test_staff_engineer_stop_ignored_after_planning_pass(
        self,
        _gates: object,
        mock_finalize: object,
    ) -> None:
        out = evaluate_subagent_stop(
            {
                "subagent_type": "staff-engineer",
                "status": "completed",
                "summary": "### Verdict\nRework\n### Required changes\n1. Fix implementation.\n",
            }
        )
        self.assertEqual(out, {})
        mock_finalize.assert_not_called()


if __name__ == "__main__":
    unittest.main()
