# Photoframe

## Branch workflow

Before making the first file edit for a new suite of changes, automatically create and check out a feature branch if currently on `main`. Use the naming convention `feature/<short-slug>` (e.g. `feature/migrate-react-native`). Do not ask for confirmation — just create the branch and mention it.

## Code review

- Staff engineer reviews are available via the `staff-engineer` agent (`.claude/agents/staff-engineer.md`). Invoke with `review_phase: planning | implementation | pre_pr`.
- Before opening a PR, run `/code-review high`. Quality rules are in `.claude/review-rules.md`.

## Project structure

- `client/` — React + Vite + TypeScript frontend (legacy, being replaced by `mobile/`)
- `mobile/` — Expo (React Native) universal app (iOS, Android, web)
- `server/` — Python (FastAPI) backend
- `config/` — Shared config (ports, API paths)
- Tests live in `client/tests/`, `mobile/tests/`, and `server/tests/`, not alongside source files.
