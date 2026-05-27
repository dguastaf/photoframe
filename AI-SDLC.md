# AI-SDLC

This document is the source of truth (SoT) for how software changes are proposed, planned, built, validated, reviewed, and released in this repository.

## Why this exists

- Keep one shared definition of "how we build software here"
- Make process changes easy to propose and apply
- Continuously validate that required steps are happening
- Identify where the process can be bypassed (intentionally or accidentally)

Out of scope for now:

- Production infrastructure outside this repository
- External systems not represented in code or docs

## Working principles

1. Every required process step must be documented here or referenced from here (e.g. `client/TESTING.md` for testing)
2. Critical checks should be automated and block further progress upon failure
3. Quality checks cannot be skipped. Exceptions can be made on a case-by-case basis by the repository owner
4. If a process step exists, it should be measurable and have a binary pass/fail result (step 6 is optional when there is nothing to capture)
5. AI agents should first validate AI work before passing off to humans
6. Humans must always give the final approval before progressing to the next step

## Change lifecycle


| Step                               | Artifacts produced                                                                                                                                                     | Exit criteria                                                                                                                        | Human role                                                            | Agent role                                                                                                                                         |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1) Intake                          | A testable problem statement with clear acceptance criteria, risk level, and shared context.                                                                           | Scope and acceptance criteria are testable.                                                                                          | Define user story and work scope.                                     | Structure intake details and flag ambiguity.                                                                                                       |
| 2) Planning                        | One approved implementation plan that includes testing strategy, validation approach, and incorporated `staff-engineer` feedback before coding begins.                 | Plan covers feature code + tests, and `staff-engineer` planning feedback is addressed.                                               | Approve plan direction and tradeoffs.                                 | Draft the plan and iterate with `staff-engineer` before implementation.                                                                            |
| 3) Implementation                  | Behavior-complete code with aligned tests/docs, passing validation evidence (tests + required linting), and updated `staff-engineer` review notes before walkthrough. | Tests and required lint/validation checks pass; `staff-engineer` findings are resolved or explicitly documented before walkthrough. | Clarify domain decisions and approve scope changes.                   | Implement scoped work, run validation, and iterate with `staff-engineer`.                                                                          |
| 4) Product walkthrough             | Shared exploratory validation notes from human + AI confirming core flows, expected behavior, and obvious UX/functionality issues.                                     | Human and AI confirm basic functionality works end-to-end, or follow-up issues are filed.                                            | Play with the feature end-to-end and decide if quality is acceptable. | Actively use the feature end-to-end as a simulated user, verify expected behavior across core flows, and log issues with clear reproduction steps. |
| 5) Pull request                    | A decision-ready PR package: summary, risk level, test evidence, and any documented exceptions or deferred recommendations.                                            | Required CI checks pass; human approves and merges.                                                                                  | Review narrative, accept risk, and merge.                             | Prepare PR package, address review feedback, and maintain audit trail.                                                                             |
| 6) Post-merge learning (as needed) | Brief notes on regressions, friction, or process gaps—only when something worth capturing surfaces.                                                                    | Material issues have follow-ups; SDLC updates happen in separate PRs when warranted.                                                 | Decide if follow-up is needed and prioritize.                         | Capture observations and suggest process fixes when asked.                                                                                         |

### Product walkthrough (how)

- **Human:** Run the app locally (see `README.md`) and exercise the changed flows by hand.
- **Agent:** Use Playwright or the existing e2e harness in `client/tests/e2e/` when UI behavior changed; otherwise run targeted API/manual checks against a local stack. See `client/TESTING.md` for ports, mocks, and commands (`npm run test:e2e`).
- **Output:** Short notes on what was tried, pass/fail per flow, and reproduction steps for any issue—no formal report required for small changes.

## Bypasses and exceptions

| Type | When | Requirement |
| --- | --- | --- |
| **Approved exception** | Emergency or owner-approved skip | Document reason, scope, approver, and expiration in the PR |
| **Unapproved bypass** | Skipped review, checks, or walkthrough without approval | Treat as process violation; capture in post-merge learning |
| **Process gap** | Step is unclear or unenforceable | File SDLC update (standalone PR per control 7) |

## Required controls (what must be true)

These controls map to enforceable checks and review gates:

1. Every change starts on a branch (no direct edits on `main`).
2. Every PR includes a test plan and risk level.
3. Required local checks run before PR creation.
4. Required CI checks pass before merge.
5. `staff-engineer` subagent review runs during planning and implementation (not only at PR time).
6. Behavior-changing changes include test updates or explicit rationale.
7. Process-changing changes update this document or linked policy docs in a standalone PR (no bundled product changes).
8. Exceptions must include reason, scope, approver, and expiration.

## Agent operating contract

When an AI agent is asked to perform work in this repo, it should:

1. Read this file before major workflow or pipeline changes
2. Follow required controls unless explicitly overridden by a human
3. Prefer automating repeated manual checks in scripts/CI
4. Leave an audit trail in commit messages, PR description, or docs
5. Flag process conflicts instead of guessing
6. Invoke `staff-engineer` during planning and implementation per the lifecycle table
7. Never treat subagent output as merge approval (human approval is always required)

## Continuous validation (how we prove compliance)

Use three layers:

1. **Prevent** (pre-commit / local checks)
  - Fast checks to catch obvious issues before commit
  - Confirm required docs/tests move with behavior changes
2. **Gate** (CI required checks)
  - Tests, lint, and policy checks enforced on PR
  - Verify PR includes required metadata (test plan, risk, exceptions)
  - Verify `staff-engineer` review occurred in planning/implementation (or an exception is documented)
3. **Detect** (audit and drift review)
  - Scheduled checks for policy drift (docs vs actual automation)
  - Spot checks of merged PRs for process adherence

Minimum validation cadence:

- Per commit: local checks
- Per PR: CI gates + review
- Weekly: process drift review + bypass review

## SDLC iteration loop

Use this loop to evolve the process:

1. Observe failures, friction, and bypasses
2. Propose a specific SDLC change in plain English
3. Implement the change in automation (scripts, hooks, CI, rules)
4. Validate the change in at least one real PR
5. Update this document with the new baseline

## Change log

- 2026-05-27: Initial first-pass version on branch `chore/sdlc-single-source-of-truth`
- 2026-05-27: Lifecycle table refined (staff-engineer in planning/implementation, product walkthrough, merged PR step, lightweight post-merge)

