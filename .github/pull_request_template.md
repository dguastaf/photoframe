## Summary

<!-- What changed and why -->

## Test plan

<!-- Required: concrete verification steps (not placeholders). CI rejects empty sections. -->

## SDLC

<!-- PR gate: planning + implementation in scripts/sdlc/reviews/<branch-slug>.json on this branch (or exception in that file). -->

- [ ] `planning` and `implementation` recorded (`python3 scripts/sdlc/record_phase.py`)
- [ ] `python3 scripts/sdlc/validate_review.py --for-pr-create` passes locally (optional; hook runs on `gh pr create`)

## Exceptions

<!-- Optional. Use when `exception` is set in the branch review JSON (reason, scope, approver, expiration). -->
