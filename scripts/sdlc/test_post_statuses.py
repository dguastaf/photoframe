#!/usr/bin/env python3
"""Tests for post_statuses.post_phase_statuses (no network; gh is mocked)."""

from __future__ import annotations

import subprocess
import unittest
from unittest import mock

import post_statuses


def _ok(*_args, **_kwargs):
    return subprocess.CompletedProcess(args=[], returncode=0, stdout="", stderr="")


class PostPhaseStatusesTest(unittest.TestCase):
    def _capture_calls(self, phases: dict) -> list[list[str]]:
        calls: list[list[str]] = []

        def fake_run(cmd, **_kwargs):
            calls.append(cmd)
            return _ok()

        with mock.patch.object(post_statuses, "_head_sha", return_value="a" * 40), \
                mock.patch.object(subprocess, "run", side_effect=fake_run):
            post_statuses.post_phase_statuses(phases)
        return [c for c in calls if c and c[0] == "gh"]

    def test_pass_maps_to_success(self):
        calls = self._capture_calls({"planning": {"outcome": "pass"}})
        self.assertEqual(len(calls), 1)
        joined = " ".join(calls[0])
        self.assertIn("context=sdlc/planning", joined)
        self.assertIn("state=success", joined)

    def test_exception_counts_as_success_with_reason(self):
        calls = self._capture_calls(
            {"implementation": {"outcome": "exception", "summary": "owner approved"}}
        )
        joined = " ".join(calls[0])
        self.assertIn("context=sdlc/implementation", joined)
        self.assertIn("state=success", joined)
        self.assertIn("description=owner approved", joined)

    def test_fail_maps_to_failure(self):
        calls = self._capture_calls({"code_review": {"outcome": "fail", "summary": "blocking"}})
        joined = " ".join(calls[0])
        self.assertIn("context=sdlc/code-review", joined)
        self.assertIn("state=failure", joined)

    def test_optional_phases_not_posted(self):
        calls = self._capture_calls(
            {"walkthrough": {"outcome": "pass"}, "pre_pr": {"outcome": "pass"}}
        )
        self.assertEqual(calls, [])

    def test_no_head_sha_skips_quietly(self):
        with mock.patch.object(post_statuses, "_head_sha", return_value=None), \
                mock.patch.object(subprocess, "run") as run:
            post_statuses.post_phase_statuses({"planning": {"outcome": "pass"}})
            run.assert_not_called()


if __name__ == "__main__":
    unittest.main()
