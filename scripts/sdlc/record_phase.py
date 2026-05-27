#!/usr/bin/env python3
"""Record a staff-engineer SDLC phase outcome in scripts/sdlc/reviews/<branch>.json."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from review_path import REVIEWS_DIR, ROOT, branch_name, review_path

VALID_PHASES = frozenset({"planning", "implementation", "walkthrough", "pre_pr"})
VALID_OUTCOMES = frozenset({"pass", "fail", "exception"})


def load_review(path: Path) -> dict:
    if path.is_file():
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise SystemExit(f"error: {path} must contain a JSON object")
        return data
    return {
        "branch": branch_name(),
        "phases": {},
        "exception": None,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "phase",
        choices=sorted(VALID_PHASES),
        help="SDLC phase (planning, implementation required for PR gate; walkthrough, pre_pr optional)",
    )
    parser.add_argument(
        "outcome",
        choices=sorted(VALID_OUTCOMES),
        help="pass, fail, or exception",
    )
    parser.add_argument(
        "summary",
        nargs="?",
        default=None,
        help="Required when outcome is fail or exception; omit on pass",
    )
    args = parser.parse_args()

    summary = (args.summary or "").strip()
    if args.outcome in ("fail", "exception") and not summary:
        raise SystemExit(
            f"error: summary is required when outcome is {args.outcome!r}"
        )

    path = review_path()
    REVIEWS_DIR.mkdir(parents=True, exist_ok=True)

    data = load_review(path)
    data["branch"] = branch_name()
    phases = data.setdefault("phases", {})
    if not isinstance(phases, dict):
        raise SystemExit("error: phases must be an object")

    entry: dict = {
        "at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "outcome": args.outcome,
    }
    if summary:
        entry["summary"] = summary
    phases[args.phase] = entry
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"recorded {args.phase}={args.outcome} -> {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
