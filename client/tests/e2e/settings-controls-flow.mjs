/**
 * Settings controls E2E: duration change persists; Sync now updates lastRefreshAt;
 * sync failure surfaces error on slideshow after return.
 */
import { chromium } from 'playwright'
import {
  baseUrl,
  isPhotoListRequest,
  mockPhotoImages,
  mockPhotoLibrary,
  record,
  SAMPLE_PHOTOS_TWO,
  setupResults,
  summarize,
} from './helpers.mjs'

const SETTINGS_STORAGE_KEY = 'photoframe.settings'
const FAST_DISPLAY_MS = 5_000

const results = setupResults()
const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  colorScheme: 'dark',
})

async function waitForSlideReady(page, timeout = 15000) {
  await page.locator('.photo-display__img:not([hidden])').waitFor({ timeout })
}

async function currentPhotoId(page) {
  return page.locator('[data-photo-id]').getAttribute('data-photo-id')
}

// --- 1. Change duration on settings → reload uses new interval ---
{
  const page = await context.newPage()
  await mockPhotoLibrary(page, SAMPLE_PHOTOS_TWO)
  await mockPhotoImages(page)
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await waitForSlideReady(page)

  await page.locator('main.frame').click()
  await page.getByRole('link', { name: 'Settings' }).click()
  await page.waitForURL('**/settings')

  await page.getByLabel('Display duration unit').selectOption('seconds')
  await page.getByRole('spinbutton', { name: 'Display duration' }).fill('5')
  await page.getByRole('spinbutton', { name: 'Display duration' }).blur()

  const stored = await page.evaluate((key) => {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  }, SETTINGS_STORAGE_KEY)
  const durationSaved = stored?.displayDurationMs === FAST_DISPLAY_MS
  record(
    results,
    'Settings saves display duration to localStorage',
    durationSaved,
    durationSaved ? `${stored.displayDurationMs} ms` : `got ${stored?.displayDurationMs}`,
  )

  await page.clock.install()
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await waitForSlideReady(page)
  const firstId = await currentPhotoId(page)
  await page.clock.fastForward(FAST_DISPLAY_MS)
  await waitForSlideReady(page)
  const nextId = await currentPhotoId(page)
  const advanced = nextId !== firstId
  record(
    results,
    'Stored duration from settings drives auto-advance after reload',
    advanced,
    advanced ? `${firstId} → ${nextId}` : `stuck on ${firstId}`,
  )
  await page.close()
}

// --- 2. Sync now updates lastRefreshAt ---
{
  const page = await context.newPage()
  let listCount = 0
  page.on('request', (request) => {
    if (isPhotoListRequest(request.url(), request.method())) {
      listCount += 1
    }
  })
  await mockPhotoLibrary(page, SAMPLE_PHOTOS_TWO)
  await mockPhotoImages(page)
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await waitForSlideReady(page)

  const beforeSync = await page.evaluate((key) => {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw).lastRefreshAt : null
  }, SETTINGS_STORAGE_KEY)

  await page.locator('main.frame').click()
  await page.getByRole('link', { name: 'Settings' }).click()
  await page.waitForURL('**/settings')
  const listAfterNav = listCount

  await page.getByRole('button', { name: 'Sync now' }).click()
  await page.getByRole('button', { name: 'Sync now' }).waitFor({ timeout: 10000 })
  await page.waitForFunction(
    (args) => {
      const raw = window.localStorage.getItem(args.key)
      if (!raw) return false
      const parsed = JSON.parse(raw)
      return (
        typeof parsed.lastRefreshAt === 'string' &&
        parsed.lastRefreshAt !== args.before
      )
    },
    { key: SETTINGS_STORAGE_KEY, before: beforeSync },
    { timeout: 10000 },
  )

  const afterSync = await page.evaluate((key) => {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw).lastRefreshAt : null
  }, SETTINGS_STORAGE_KEY)

  const syncFetch = listCount > listAfterNav
  const refreshed =
    syncFetch &&
    typeof afterSync === 'string' &&
    afterSync !== beforeSync
  record(
    results,
    'Sync now refetches library and updates lastRefreshAt',
    refreshed,
    refreshed
      ? `list requests=${listCount}`
      : `list=${listCount} nav=${listAfterNav} before=${beforeSync} after=${afterSync}`,
  )
  await page.close()
}

// --- 3. Sync failure → back to slideshow shows error ---
{
  const page = await context.newPage()
  await mockPhotoLibrary(page, SAMPLE_PHOTOS_TWO)
  await mockPhotoImages(page)
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await waitForSlideReady(page)

  await page.locator('main.frame').click()
  await page.getByRole('link', { name: 'Settings' }).click()
  await page.waitForURL('**/settings')

  await page.unroute(/\/api\/v0\/photos\/?(\?.*)?$/)
  await page.route(/\/api\/v0\/photos\/?(\?.*)?$/, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'Service unavailable' }),
    })
  })

  await page.getByRole('button', { name: 'Sync now' }).click()
  await page.getByRole('button', { name: 'Sync now' }).waitFor({ timeout: 10000 })

  await page.getByRole('link', { name: 'Back to slideshow' }).click()
  await page.locator('.frame-message__error').waitFor({ timeout: 10000 })

  const hasError = await page.locator('.frame-message__error').isVisible()
  record(
    results,
    'Sync failure shows global error UI on slideshow after back link',
    hasError,
    hasError ? 'error visible' : 'no error message',
  )
  await page.close()
}

await browser.close()
summarize(results)
