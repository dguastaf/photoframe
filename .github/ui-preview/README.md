# UI preview assets (optional)

Optional screenshots and videos for pull requests or docs. Nothing in CI requires these files.

| Asset | When to refresh |
| --- | --- |
| `app-shell.png` | Layout, copy, styling, or static visual tweaks |
| `app-flow.webm` | Interactions, navigation, **slideshow auto-advance**, animations |

## Capture (local)

```bash
cd client
npm install
npx playwright install chromium   # first time only
npm run ui:preview                # screenshot + video + validation
git add .github/ui-preview/
```

| Command | What it does |
| --- | --- |
| `npm run ui:preview` | Both assets + validates size/duration |
| `npm run ui:screenshot` | Static frame only |
| `npm run ui:video` | Flow video (loading → photo → slide change) |
| `npm run ui:validate` | Check existing assets without re-capturing |
| `npm run ui:embed` | Print PR description markdown (correct raw screenshot URL) |

Vite is started automatically (or reused if already on port 6389). API routes are mocked; the server does not need to run.

### Why previews break

- Running **`ui:video` only** after slideshow work → tiny WebM (~15KB) with no slide change.
- **`ui:screenshot` only** → video stays stale.
- Dev server port conflict → capture fails mid-run; commit truncated WebM.
- **1×1 mock photo bytes** → `app-shell.png` looks empty (~4KB black frame). Capture uses `scripts/ui-preview/fixtures/mock-photo-*.png` (1280×720 gradients) instead.

`ui:preview` records library load, first photo, then **fast-forwards the 60s timer** to show auto-advance. Validation fails if `app-flow.webm` &lt; 40KB or &lt; 3s (when `ffprobe` is available).

## PR attachment

To embed in a PR description:

```bash
cd client && npm run ui:embed
```

Paste the printed block into the PR. **Do not** hand-write `![...](.github/ui-preview/app-shell.png)` — GitHub does not render that in PR bodies. Use `raw.githubusercontent.com` URLs from the embed script output.
