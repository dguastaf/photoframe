# Client testing

All client tests live under `tests/` — never under `src/` (production code only).

```
client/tests/
├── setup.ts              # Vitest + Testing Library global setup
├── unit/                 # Vitest component/unit tests (*.test.tsx)
└── e2e/
    ├── helpers.mjs
    ├── photo-library-flow.mjs   # Playwright: library load, errors, empty, retry
    ├── slideshow-flow.mjs       # Playwright: auto-advance, pause while loading
    ├── swipe-navigation-flow.mjs # Playwright: swipe and arrow-key navigation
    ├── tap-overlay-flow.mjs       # Playwright: tap metadata overlay toggle + swipe dismiss
    └── screenshots/             # gitignored output from e2e flows
```

## Unit tests (Vitest)

CI runs `npm test` in the `client-test` workflow job on every PR and push to `main`.

```bash
cd client
npm test              # single run
npm run test:watch    # watch mode
```

Imports use the `@/` alias to reach `src/` (configured in `vite.config.ts`).

## E2E (Playwright)

CI runs `npm run test:e2e` in the `client-e2e` job (mock API on **52525**, Vite dev server on **6389**).

| Script | Coverage |
|--------|----------|
| `photo-library-flow.mjs` | Loading, happy path, API errors, empty library, retry |
| `slideshow-flow.mjs` | Auto-advance (60s), pause while loading, multi-photo cycle, empty |
| `swipe-navigation-flow.mjs` | Swipe left/right and arrow keys forward/back through shuffle |
| `tap-overlay-flow.mjs` | Tap toggles date/folder overlay; swipe while open hides overlay and updates metadata |

Both flows mock `GET /api/v0/photos` and image routes via Playwright helpers — **Photoprism is not required** for most scenarios. Scenario 1 in `photo-library-flow` uses a delayed proxy response when the list route is not mocked.

```bash
cd client
npm install
npx playwright install chromium   # first time only
npm run test:e2e
```

Screenshots are written to `tests/e2e/screenshots/` (gitignored).
