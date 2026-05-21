# UI preview assets for pull requests

Every commit that changes UI source files must update preview assets here. Pre-commit and CI enforce presence **and** minimum quality (size/duration).

| Asset | When to refresh |
| --- | --- |
| `app-shell.png` | Layout, copy, styling, or static visual tweaks |
| `app-flow.webm` | Interactions, navigation, **slideshow auto-advance**, animations |

## Capture (local)

**Always prefer the full capture** — partial runs produce broken PR videos:

```bash
cd client
npm install
npx playwright install chromium   # first time only
npm run ui:preview                # screenshot + video + validation
git add .github/ui-preview/
```

| Command | What it does |
| --- | --- |
| `npm run ui:preview` | **Recommended.** Both assets + validates size/duration |
| `npm run ui:screenshot` | Static frame only |
| `npm run ui:video` | Flow video (loading → photo → slide change) |
| `npm run ui:validate` | Check existing assets without re-capturing |

Vite is started automatically (or reused if already on port 6389). API routes are mocked; the server does not need to run.

### Why previews break

- Running **`ui:video` only** after slideshow work → tiny WebM (~15KB) with no slide change; useless in PRs.
- **`ui:screenshot` only** → video stays stale.
- Dev server port conflict → capture fails mid-run; commit truncated WebM.

`ui:preview` records library load, first photo, then **fast-forwards the 60s timer** to show auto-advance. Validation fails if `app-flow.webm` &lt; 40KB or &lt; 3s (when `ffprobe` is available).

## PR attachment

Commit these files on your branch. Embed in the PR description:

```markdown
## UI preview
![App shell](.github/ui-preview/app-shell.png)
https://github.com/OWNER/REPO/blob/BRANCH/.github/ui-preview/app-flow.webm
```
