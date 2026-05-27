# SDLC automation

Scripts and review artifacts for [`AI-SDLC.md`](../../AI-SDLC.md) `staff-engineer` gates.

| Script | Purpose |
| ------ | ------- |
| `record_phase.py` | Record phase outcome in `reviews/<branch-slug>.json` |
| `validate_review.py` | Validate review file (+ PR test plan in CI) |
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
| `planning` + `implementation` phases recorded (`outcome: pass`) | Cursor `gh pr create` hook, CI `sdlc-policy` (skipped for process-only diffs) |
| PR **Test plan** section (non-empty, non-placeholder) | CI `sdlc-policy` (skipped when diff has no product/test paths) |
| `walkthrough` / `pre_pr` phase records | Not enforced by hook or CI (optional audit trail) |
| PR **Exceptions** section body fields | Not enforced (optional for now) |

Workflow rules (`.cursor/rules/`) may still require walkthrough or a pre-PR `staff-engineer` run before you open a PR; that is separate from the gate above.

### Process-only diffs (auto-skip product gates)

When **no** changed files touch product or test trees (e.g. only `scripts/sdlc/`, `.cursor/`, `AI-SDLC.md`, PR template, workflow wiring), CI and the hook **do not** require:

- `planning` / `implementation` review records (review JSON optional)
- A substantive PR **Test plan** (section may still be present)

Detection uses `git diff <base>...HEAD` via `changed_paths.py`. Changes under `server/app/`, `client/src/`, `server/tests/`, `client/tests/`, dependencies, Docker, or UI preview scripts still require full gates.

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

## Approved exception

When the repository owner approves skipping planning/implementation records, set `exception` in the JSON (reason, scope, approver, expires). You may also note it in the PR **Exceptions** section; that section is not validated by CI today.

```json
"exception": {
  "reason": "Emergency hotfix",
  "scope": "Skip planning artifact; single-line fix",
  "approver": "owner-handle",
  "expires": "2026-06-15"
}
```

When `exception` is valid, planning/implementation phase records are not required for the PR gate.
