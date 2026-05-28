# SDLC automation

Scripts and review artifacts for [`AI-SDLC.md`](../../AI-SDLC.md) `staff-engineer` gates.

| Script | Purpose |
| ------ | ------- |
| `record_phase.py` | Record phase outcome in `reviews/<branch-slug>.json` |
| `validate_review.py` | Validate review file (+ PR test plan in CI) |
| `pre_implementation_gate.py` | Branch + planning gate before product/test edits (Cursor hook) |
| `review_path.py` | Resolve review file path for current branch |
| `drift_check.py` | Verify automation files exist |
| `sdlc-check.sh` | Local helper: optional tests + `validate_review --for-pr-create` |

## Review file location

One file per branch, committed on that branch before opening a PR:

```
scripts/sdlc/reviews/<branch-slug>.json
```

`<branch-slug>` is the current git branch with `/` replaced by `-` (see `review_path.py`).

## What hooks and CI enforce

| Check | Enforced by |
| ----- | ----------- |
| Feature branch (not `main` / `master`) before product/test edits | Cursor `preToolUse` hook (`.cursor/hooks/before-implementation-edit.sh`) |
| `planning` phase recorded (`outcome: pass`) before product/test edits | Same `preToolUse` hook (owner `exception` may skip planning) |
| `planning` + `implementation` phases recorded (`outcome: pass`) | Always — Cursor hook + CI `sdlc-policy` (owner `exception` may skip) |
| PR **Test plan** section (non-empty, non-placeholder) | CI `sdlc-policy` when **production code** changed (`server/app/`, `client/src/`, runtime config) |
| `walkthrough` / `pre_pr` phase records | Not enforced by hook or CI (optional audit trail) |
| PR **Exceptions** section body fields | Not enforced (optional for now) |

Workflow rules (`.cursor/rules/`) may still require walkthrough or a pre-PR `staff-engineer` run before you open a PR; that is separate from the gate above.

### Pre-implementation hook (before any product code)

The `preToolUse` hook runs on agent `Write`, `StrReplace`, and `EditNotebook` when the target path is production code (`server/app/`, `client/src/`, runtime config) or tests (`server/tests/`, `client/tests/`). It **denies** the edit unless:

1. Current branch is not `main` or `master`.
2. `scripts/sdlc/reviews/<branch-slug>.json` has `phases.planning.outcome: pass` (or a valid owner `exception`).

Exempt (always allowed): `scripts/sdlc/`, `.cursor/` — so you can record planning and adjust hooks/rules on the branch.

Manual check:

```bash
python3 scripts/sdlc/pre_implementation_gate.py --path client/src/App.tsx
```

Hook stdin smoke test:

```bash
printf '%s' '{"tool_name":"Write","tool_input":{"path":"client/src/App.tsx"}}' \
  | python3 scripts/sdlc/pre_implementation_gate.py --hook-stdin
```

### Split criteria (same diff, different gates)

| Gate | When required |
| ---- | ------------- |
| **Staff-engineer** (`planning` + `implementation` in review JSON) | **Every PR** — including docs, SDLC, and README-only changes |
| **PR test plan** (substantive **Test plan** section) | Only when **production code** changed |

Production code paths: `server/app/`, `client/src/`, and runtime config (`server/pyproject.toml`, `client/package.json`, `.env.example`, Docker files). Changes only under `server/tests/`, `client/tests/`, `scripts/sdlc/`, `.cursor/`, docs, or CI wiring do **not** require a substantive test plan (CI still runs the normal test jobs).

Detection uses `git diff <base>...HEAD` via `changed_paths.py`.

## Schema (minimum for PR gate)

```json
{
  "branch": "feature/my-work",
  "phases": {
    "planning": {
      "at": "2026-05-27T18:00:00Z",
      "outcome": "pass"
    },
    "implementation": {
      "at": "2026-05-27T19:30:00Z",
      "outcome": "pass"
    }
  },
  "exception": null
}
```

Optional phase entries (not required for hook/CI):

```json
"walkthrough": { "at": "...", "outcome": "pass" },
"pre_pr": { "at": "...", "outcome": "pass" }
```

On **failure**, include `summary` with what blocked the phase:

```json
"planning": {
  "at": "2026-05-27T18:00:00Z",
  "outcome": "fail",
  "summary": "Plan missing test strategy for adapter swap."
}
```

`outcome` must be `pass`, `fail`, or `exception`. **`summary` is required only when `outcome` is `fail` or `exception`.**

## Recording phases

After each `staff-engineer` subagent run for that phase:

```bash
# Required for PR gate (pass — no summary)
# planning: final plan draft, before implementation
python3 scripts/sdlc/record_phase.py planning pass
# implementation: final change set, before walkthrough
python3 scripts/sdlc/record_phase.py implementation pass

# Optional audit trail
python3 scripts/sdlc/record_phase.py walkthrough pass
python3 scripts/sdlc/record_phase.py pre_pr pass

# fail — summary required
python3 scripts/sdlc/record_phase.py planning fail "Plan missing test strategy."
```

## Validation

```bash
# Same checks as the gh pr create hook
python3 scripts/sdlc/validate_review.py --for-pr-create

# Local helper: touched-area tests + review artifact (tests also run in CI on PR)
./scripts/sdlc/sdlc-check.sh

# CI on pull requests (review file + PR test plan)
python3 scripts/sdlc/validate_review.py --ci --branch <head-ref> --pr-body-file /path/to/body.md
```

## Approved exception (staff-engineer only)

Use when the owner approves skipping required `planning` / `implementation` staff-engineer records. Set `exception` in the review JSON (reason, scope, approver, expires). You may also note it in the PR **Exceptions** section; that section is not validated by CI today.

Exceptions do **not** waive the test plan when production code changed.

```json
"exception": {
  "reason": "Emergency hotfix",
  "scope": "Skip planning artifact; single-line fix",
  "approver": "owner-handle",
  "expires": "2026-06-15"
}
```

When `exception` is valid, planning/implementation phase records are not required for the PR gate.
