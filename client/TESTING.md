# Client testing

All client tests live under `tests/` — never under `src/` (production code only).

```
client/tests/
├── setup.ts              # Vitest + Testing Library global setup
├── unit/                 # Vitest component/unit tests (*.test.tsx)
└── e2e/
    ├── photo-library-flow.mjs   # Playwright: library load, errors, empty, retry
    └── screenshots/             # gitignored output from photo-library-flow
```

## Unit tests (Vitest)

```bash
cd client
npm test              # single run
npm run test:watch    # watch mode
```

Imports use the `@/` alias to reach `src/` (configured in `vite.config.ts`).

## E2E: photo library flow (Playwright)

`photo-library-flow.mjs` exercises loading, happy path, API errors, empty library, and Retry. Requires API on **52525** and `npm run dev` on **6389**.

```bash
cd client
npm install
npx playwright install chromium   # first time only
npm run test:e2e
```

Screenshots are written to `tests/e2e/screenshots/`.
