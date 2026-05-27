## Summary

<!-- What changed and why -->

## Test plan

<!-- Required: concrete verification steps (not placeholders). CI rejects empty sections. -->

## SDLC

<!-- Always: planning + implementation in scripts/sdlc/reviews/<branch-slug>.json (or owner exception). Test plan required only when production code changed — see scripts/sdlc/README.md. -->

- [ ] `python3 scripts/sdlc/validate_review.py --for-pr-create` passes (hook runs on `gh pr create`)

## Exceptions

<!-- When owner approves skipping required staff-engineer phases (reason, scope, approver, expiration in review JSON). -->
