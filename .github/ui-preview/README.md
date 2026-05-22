# UI preview assets for pull requests

Pull requests that change UI source must include at least one updated file here (screenshot or video). CI enforces this when the PR is opened; individual commits do not need to touch these assets.

| Asset | When to refresh |
| --- | --- |
| `app-shell.png` | Layout, copy, styling, or static visual tweaks |
| `app-flow.webm` | Interactions, navigation, animations, or multi-step flows |

## Capture (local)

```bash
cd client
npm install
npx playwright install chromium   # first time only
npm run ui:screenshot             # static UI
npm run ui:video                  # interaction / flow
# or both:
npm run ui:preview
git add .github/ui-preview/
```

Vite is started automatically; `/health` is mocked so the server does not need to run.

Video capture prefers Playwright’s bundled ffmpeg (`npx playwright install ffmpeg`). If that is unavailable, the script falls back to system `ffmpeg` (frame sequence → WebM).

## PR attachment

Commit these files on your branch. They appear in the PR diff and give reviewers a visual before running the app. For larger flows, prefer updating `app-flow.webm`; for small tweaks, `app-shell.png` is enough (you may update both).
