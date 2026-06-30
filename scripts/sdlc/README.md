# SDLC automation

Scripts and review artifacts for [`AI-SDLC.md`](../../AI-SDLC.md) `staff-engineer` gates.

| Script | Purpose |
| ------ | ------- |
| `record_phase.py` | Record phase outcome locally + post commit statuses for the merge gate |
| `post_statuses.py` | Post `sdlc/*` commit statuses for recorded phases onto current HEAD (best-effort) |
| `validate_review.py` | Local pre-PR review-file check; PR test-plan check in CI |
| `pre_implementation_gate.py` | Pre-implementation gate (edit/Task/subagentStop gates) |
| `planning_orchestrator.py` | Pending branch, auto `git checkout -b`, planning record on review pass |
| `parse_staff_review.py` | Parse staff-engineer verdict from subagent summary |
| `review_path.py` | Resolve local review file path for current branch |
| `drift_check.py` | Verify automation files exist |
| `sdlc-check.sh` | Local helper: optional tests + `validate_review --for-pr-create` |

## Where phase verdicts live

Phase verdicts have **two homes for two jobs**, and deliberately are *not* a committed file:

1. **Local pre-edit gate** — `scripts/sdlc/reviews/<branch-slug>.json`, written by
   `record_phase.py`. This drives the pre-implementation hooks on your machine before a PR
   exists. It is **local-only and gitignored** (`reviews/.gitignore`); it never enters the tree,
   so it never lands on `main` and there is nothing to clean up after merge.
   `<branch-slug>` is the current git branch with `/` replaced by `-` (see `review_path.py`).

2. **Merge gate** — GitHub **commit statuses** `sdlc/planning`, `sdlc/implementation`,
   `sdlc/code-review`, posted onto the PR head SHA. These render natively as the per-phase
   ✅/❌ checklist on the PR. `record_phase.py` posts them (via `post_statuses.py`) for every
   recorded phase to the current HEAD; the `sdlc-policy` CI job re-asserts the latest verdict for
   each context onto each new head SHA on every push (so a re-push never orphans a verdict) and
   fails red if any phase is missing or not passing.

Verdict → status state: `pass` and `exception` → `success` (the exception reason rides in the
status description); `fail` → `failure`; never recorded → `failure` ("not recorded").

Posting is **best-effort**: if `gh` is missing, unauthenticated, offline, or HEAD is not yet
pushed, `record_phase.py` warns and continues. The CI job is the authoritative gate — it runs on
every push and fails the required `sdlc-policy` check until all three phases are green on the
head SHA.

## What hooks and CI enforce

| Check | Enforced by |
| ----- | ----------- |
| Feature branch (not `main` / `master`) before product/test edits | Pre-implementation gate (`scripts/sdlc/pre_implementation_gate.py`) |
| `planning` phase recorded (`outcome: pass`) before product/test edits | Same gate (owner `exception` or `planning_exception` may skip planning) |
| `planning` + `implementation` + `code_review` verdicts green | CI `sdlc-policy` aggregates the `sdlc/*` commit statuses on the head SHA; fails red if any is missing or not passing (an `exception` outcome posts as `success` with its reason in the description) |
| PR **Test plan** section (non-empty, non-placeholder) | CI `sdlc-policy` when **production code** changed (`server/app/`, `client/src/`, runtime config) |
| `walkthrough` / `pre_pr` phase records | Not enforced by hook or CI (optional audit trail) |
| PR **Exceptions** section body fields | Not enforced (optional for now) |

The `staff-engineer` agent (`.claude/agents/staff-engineer.md`) may still require walkthrough or a pre-PR review before you open a PR; that is separate from the gate above.

### Pre-implementation hooks (planning review + branch)

**Edit gate** (`preToolUse` on `Write` / `StrReplace` / `EditNotebook`): denies product/test path edits until planning is recorded on a feature branch (or valid owner `exception`).

**Subagent gate** (`preToolUse` on `Task`): while blocked, only the **`staff-engineer`** subagent may run; other subagents are denied.

**Planning completion** (`subagentStop` on `staff-engineer`): when the review completes with a **Ship** verdict and no required changes, the hook automatically:

1. Runs `git checkout -b <proposed-branch>` when on `main` / `master` (branch name is proposed from the file path or `PHOTOFRAME_SDLC_BRANCH`)
2. Runs `python3 scripts/sdlc/record_phase.py planning pass`
3. Sends a follow-up message so the agent can continue implementation

Agent flow: attempt edit → denied → delegate **staff-engineer** with `review_phase: planning` and the full plan → on pass, branch + review file are created → edits allowed.

Exempt (always allowed): `scripts/sdlc/`, `.claude/`.

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

Production code paths: `server/app/`, `client/src/`, and runtime config (`server/pyproject.toml`, `client/package.json`, `.env.example`, Docker files). Changes only under `server/tests/`, `client/tests/`, `scripts/sdlc/`, `.claude/`, docs, or CI wiring do **not** require a substantive test plan (CI still runs the normal test jobs).

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
    },
    "code_review": {
      "at": "2026-05-27T20:00:00Z",
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
# code_review: after /code-review high passes with no blocking findings
python3 scripts/sdlc/record_phase.py code_review pass

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

# CI on pull requests (PR test plan only; phase verdicts gated by sdlc/* commit statuses)
python3 scripts/sdlc/validate_review.py --ci --pr-body-file /path/to/body.md
```

## Approved exception (staff-engineer only)

**For the merge gate**, record the exception *per phase* so it posts a passing `sdlc/*` commit
status with the reason in its description:

```bash
python3 scripts/sdlc/record_phase.py planning exception "Owner approved: planned without an agent"
```

The top-level `exception` object below is still honored by the **local** `--for-pr-create` check
(reason, scope, approver, expires), but it does not post commit statuses — the merge gate reads
the per-phase `sdlc/*` statuses, so use a per-phase `exception` outcome for anything that must
pass CI.

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

## Planning-only exception (no agent used to plan)

Use when the work was planned without delegating to an agent (e.g. planned interactively with the owner) instead of via the `staff-engineer` subagent. Set `planning_exception` in the review JSON with the same fields as `exception` (reason, scope, approver, expires). Unlike `exception`, this **only** waives the `planning` phase — `implementation` and `code_review` staff-engineer records are still required.

```json
"planning_exception": {
  "reason": "Planned interactively with the owner, no agent delegated to plan",
  "scope": "Skip planning artifact only; implementation and code_review still required",
  "approver": "owner-handle",
  "expires": "2026-07-15"
}
```
