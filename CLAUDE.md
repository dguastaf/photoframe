# Photoframe

## Branch workflow

Before making the first file edit for a new suite of changes, automatically create and check out a feature branch if currently on `main`. Use the naming convention `feature/<short-slug>` (e.g. `feature/migrate-react-native`). Do not ask for confirmation — just create the branch and mention it.

## SDLC

- See `AI-SDLC.md` for the full development lifecycle.
- Staff engineer reviews are available via the `staff-engineer` agent (`.claude/agents/staff-engineer.md`). Invoke with `review_phase: planning | implementation | pre_pr`.
- Before opening a PR, run `/code-review high` and record the outcome with `python3 scripts/sdlc/record_phase.py code_review pass`. Quality rules are in `.claude/review-rules.md`.
- Record outcomes with `python3 scripts/sdlc/record_phase.py <phase> <outcome>`.
- CI validates that `planning`, `implementation`, and `code_review` phases pass before PR merge.

## Project structure

- `client/` — React + Vite + TypeScript frontend
- `server/` — Python (FastAPI) backend
- `config/` — Shared config (ports, API paths)
- Tests live in `client/tests/` and `server/tests/`, not alongside source files.
