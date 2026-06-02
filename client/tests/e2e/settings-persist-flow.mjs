/**
 * Settings persistence E2E: stored display duration drives auto-advance; lastRefreshAt in localStorage.
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

function seedSettings(displayDurationMs, lastRefreshAt = null) {
  return {
    version: 0,
    displayDurationMs,
    lastRefreshAt,
    dailyRefreshTime: null,
  }
}

async function waitForSlideReady(page, timeout = 15000) {
  await page.locator('.photo-display__img:not([hidden])').waitFor({ timeout })
}

async function currentPhotoId(page) {
  return page.locator('[data-photo-id]').getAttribute('data-photo-id')
}

// --- 1. Stored duration survives reload and speeds auto-advance ---
{
  const page = await context.newPage()
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, JSON.stringify(value))
    },
    { key: SETTINGS_STORAGE_KEY, value: seedSettings(FAST_DISPLAY_MS) },
  )
  await mockPhotoLibrary(page, SAMPLE_PHOTOS_TWO)
  await mockPhotoImages(page)
  await page.clock.install()
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await waitForSlideReady(page)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await waitForSlideReady(page)
  const firstId = await currentPhotoId(page)
  await page.clock.fastForward(FAST_DISPLAY_MS)
  await waitForSlideReady(page)
  const nextId = await currentPhotoId(page)
  const changed = nextId !== firstId
  record(
    results,
    'Reloaded app uses stored display duration for auto-advance',
    changed,
    changed ? `${firstId} → ${nextId}` : `stuck on ${firstId}`,
  )
  await page.close()
}

// --- 2. Successful load persists lastRefreshAt ---
{
  const page = await context.newPage()
  await mockPhotoLibrary(page, SAMPLE_PHOTOS_TWO)
  await mockPhotoImages(page)
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await waitForSlideReady(page)
  const stored = await page.evaluate((key) => {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  }, SETTINGS_STORAGE_KEY)
  const hasRefresh =
    stored != null &&
    typeof stored.lastRefreshAt === 'string' &&
    !Number.isNaN(Date.parse(stored.lastRefreshAt))
  record(
    results,
    'Library fetch persists lastRefreshAt in localStorage',
    hasRefresh,
    hasRefresh ? stored.lastRefreshAt : 'missing or invalid',
  )
  await page.close()
}

// --- 3. Overdue lastRefreshAt: one list fetch on load (catch-up), no immediate second fetch ---
{
  const page = await context.newPage()
  const overdue = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, JSON.stringify(value))
    },
    { key: SETTINGS_STORAGE_KEY, value: seedSettings(60_000, overdue) },
  )
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
  await page.waitForTimeout(500)
  const countAfterLoad = listCount
  await page.waitForTimeout(500)
  const noImmediateSecondRefresh = listCount === countAfterLoad
  const ok =
    countAfterLoad >= 1 &&
    countAfterLoad <= 2 &&
    noImmediateSecondRefresh
  record(
    results,
    'Overdue lastRefreshAt does not schedule immediate second list fetch',
    ok,
    ok
      ? `${countAfterLoad} list request(s), stable after load`
      : `${countAfterLoad} then ${listCount} list requests`,
  )
  await page.close()
}

await browser.close()
summarize(results)
