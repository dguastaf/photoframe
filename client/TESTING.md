# Client testing

## Unit tests (Vitest)

```bash
cd client
npm test              # single run
npm run test:watch    # watch mode
```

Tests live next to source under `src/**/*.test.ts(x)`.

## E2E (Playwright)

Two flows under `tests/e2e/`:

| Script | Coverage |
|--------|----------|
| `photo-library-flow.mjs` | Loading, happy path, API errors, empty library, retry |
| `slideshow-flow.mjs` | Auto-advance (60s), pause while loading, multi-photo cycle, empty |

**Prerequisites**

- Vite dev server on **6389**: `npm run dev` (from `client/`)
- `photo-library-flow` scenarios 2 and 4–7 also need the API on **52525** (or rely on mocked routes where noted)
- `slideshow-flow` mocks all API routes — **dev server only**

```bash
cd client
npx playwright install chromium   # first time only
npm run test:e2e
```

Screenshots are written to `tests/e2e/screenshots/` (gitignored).
