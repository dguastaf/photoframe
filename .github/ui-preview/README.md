# UI preview assets (optional)

Optional screenshots and videos for pull requests or docs. Nothing in CI requires these files.

| Asset | When to refresh |
| --- | --- |
| `app-shell.png` | Layout, copy, styling, or static visual tweaks |
| `app-flow.webm` | Source recording (interactions, navigation, slideshow) |
| `app-flow.gif` | **PR embed** — generated from WebM; use `npm run ui:embed` (no manual upload) |

## Capture (local)

```bash
cd client
npm install
npx playwright install chromium   # first time only
npm run ui:preview                # video + gif + validation
git add .github/ui-preview/
```

| Command | What it does |
| --- | --- |
| `npm run ui:preview` | WebM, GIF, validate, print PR embed block |
| `npm run ui:screenshot` | Static frame only |
| `npm run ui:video` | WebM + GIF for PRs |
| `npm run ui:validate` | Check existing assets without re-capturing |
| `npm run ui:embed` | Print PR description markdown (raw GIF URL) |

Vite is started automatically (or reused if already on port 6389). API routes are mocked; the server does not need to run.

### Why previews break

- Running **`ui:video` only** after slideshow work → tiny WebM (~15KB) with no slide change.
- **`ui:screenshot` only** → flow assets stay stale.
- Dev server port conflict → capture fails mid-run; commit truncated WebM.
- **1×1 mock photo bytes** → `app-shell.png` looks empty (~4KB black frame). Capture uses `scripts/ui-preview/fixtures/mock-photo-*.png` (1280×720 gradients) instead.

`ui:preview` records library load, first photo, then **fast-forwards the 60s timer** to show auto-advance. Validation fails if `app-flow.webm` &lt; 40KB or &lt; 3s (when `ffprobe` is available), or if `app-flow.gif` is missing or too small.

## PR embed (automated)

GitHub does **not** inline-play repo links to `.webm` / `.mp4`. **`app-flow.gif`** is committed and referenced via `raw.githubusercontent.com` so it renders inline in PR descriptions with no drag-and-drop.

```bash
cd client && npm run ui:embed
```

Paste the printed block into the PR (or use it in `gh pr create --body`). **Do not** hand-write `![...](.github/ui-preview/...)` — relative paths do not render. **Do not** paste bare links to `.webm` in the repo.
