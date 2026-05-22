/**
 * Photo library E2E: loading, errors, empty, retry.
 * Run with `npm run dev` on 6389; routes mock list/images when needed.
 * Usage (from client/): npx playwright install chromium && npm run test:e2e
 */
import { chromium } from 'playwright'
import {
  baseUrl,
  isPhotoListRequest,
  mockPhotoImages,
  mockPhotoLibrary,
  record,
  SAMPLE_PHOTOS_ONE,
  setupResults,
  shot,
  summarize,
} from './helpers.mjs'

const results = setupResults()

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  colorScheme: 'dark',
})

// --- 1. Loading state (delayed library) ---
{
  const page = await context.newPage()
  await page.route(/\/api\/v0\/photos\/?(\?.*)?$/, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await new Promise((r) => setTimeout(r, 2000))
    await route.continue()
  })
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  const loadingVisible = await page
    .getByText('Loading photos…')
    .waitFor({ timeout: 5000 })
    .then(() => true)
    .catch(() => false)
  await shot(page, 'lib-01-loading.png')
  record(results, 'Launch shows loading library', loadingVisible)
  await page.close()
}

// --- 2. Happy path: library + photo (mocked API) ---
{
  const page = await context.newPage()
  await mockPhotoLibrary(page, SAMPLE_PHOTOS_ONE)
  await mockPhotoImages(page)
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  const ok = await page
    .locator('[data-photo-id][data-status="ready"]')
    .waitFor({ timeout: 15000 })
    .then(() => true)
    .catch(() => false)
  await shot(page, 'lib-02-happy.png')
  record(results, 'Happy path shows photo', ok)
  await page.close()
}

// --- 3. API error on mount ---
{
  const page = await context.newPage()
  await page.route(/\/api\/v0\/photos\/?(\?.*)?$/, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'Photo library unavailable (test)' }),
    })
  })
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  const err = await page.getByText('Photo library unavailable (test)').isVisible()
  const noPhotos = await page.getByText('No photos in library').isVisible()
  const retry = await page.getByRole('button', { name: 'Retry' }).isVisible()
  await shot(page, 'lib-03-api-error.png')
  record(results, 'API error shows error message', err)
  record(results, 'API error also shows empty-library block', noPhotos)
  record(results, 'Retry visible on error (no photos loaded)', retry)
  await page.close()
}

// --- 4. Retry after error recovers ---
{
  const page = await context.newPage()
  let fail = true
  await page.route(/\/api\/v0\/photos\/?(\?.*)?$/, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    if (fail) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Temporary failure (test)' }),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(SAMPLE_PHOTOS_ONE),
    })
  })
  await mockPhotoImages(page)
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.getByText('Temporary failure (test)').waitFor({ timeout: 5000 })
  fail = false
  await page.getByRole('button', { name: 'Retry' }).click()
  const recovered = await page
    .locator('[data-photo-id][data-status="ready"]')
    .waitFor({ timeout: 20000 })
    .then(() => true)
    .catch(() => false)
  await shot(page, 'lib-04-retry.png')
  record(results, 'Library Retry recovers to photo', recovered)
  await page.close()
}

// --- 5. Empty library ---
{
  const page = await context.newPage()
  await page.route(/\/api\/v0\/photos\/?(\?.*)?$/, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    })
  })
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  const empty = await page.getByText('No photos in library').isVisible()
  const retry = await page.getByRole('button', { name: 'Retry' }).isVisible()
  const noSlideshow = (await page.locator('.photo-display').count()) === 0
  await shot(page, 'lib-05-empty.png')
  record(results, 'Empty library shows no-photos message', empty)
  record(results, 'Empty library shows Retry', retry)
  record(results, 'Empty library does not show slideshow', noSlideshow)
  await page.close()
}

// --- 6. Retry loading state (library) ---
{
  const page = await context.newPage()
  let mockEmpty = true
  await page.route(/\/api\/v0\/photos\/?(\?.*)?$/, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    if (mockEmpty) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      return
    }
    await new Promise((r) => setTimeout(r, 2500))
    await route.continue()
  })
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.getByText('No photos in library').waitFor({ timeout: 10000 })
  mockEmpty = false
  await page.getByRole('button', { name: 'Retry' }).click()
  const loadingAfterRetry = await page
    .getByText('Loading photos…')
    .waitFor({ timeout: 3000 })
    .then(() => true)
    .catch(() => false)
  await shot(page, 'lib-06-retry-loading.png')
  record(results, 'Library Retry shows loading state', loadingAfterRetry)
  await page.close()
}

// --- 7. Rapid double Retry (abort path) ---
{
  const page = await context.newPage()
  let listRequests = 0
  let mockEmpty = true
  await page.route('**/api/v0/photos**', async (route) => {
    const req = route.request()
    if (!isPhotoListRequest(req.url(), req.method())) {
      await route.continue()
      return
    }
    listRequests += 1
    if (mockEmpty) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      return
    }
    await new Promise((r) => setTimeout(r, 2000))
    await route.continue()
  })
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.getByText('No photos in library').waitFor({ timeout: 10000 })
  mockEmpty = false
  const retryBtn = page.getByRole('button', { name: 'Retry' })
  await retryBtn.dblclick()
  await page.waitForTimeout(300)
  const loading = await page.getByText('Loading photos…').isVisible()
  await shot(page, 'lib-07-double-retry-loading.png')
  const settled = await Promise.race([
    page.locator('[data-photo-id][data-status="ready"]').waitFor({ timeout: 15000 }),
    page.getByText('No photos in library').waitFor({ timeout: 15000 }),
    page.locator('.frame-message__error').waitFor({ timeout: 15000 }),
  ])
    .then(() => true)
    .catch(() => false)
  await shot(page, 'lib-07-double-retry-settled.png')
  record(results, 'Double library Retry shows loading', loading)
  record(results, 'Double library Retry settles without crash', settled)
  record(
    results,
    'Double Retry issued multiple list requests',
    listRequests >= 2,
    `count=${listRequests}`,
  )
  await page.close()
}

await browser.close()
summarize(results)
