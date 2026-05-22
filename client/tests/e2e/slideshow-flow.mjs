/**
 * Slideshow E2E: auto-advance, pause-while-loading, multi-photo cycle, empty library.
 * Fully mocked API routes — dev server on 6389 only (API need not be running).
 */
import { chromium } from 'playwright'
import {
  baseUrl,
  mockPhotoImages,
  mockPhotoLibrary,
  record,
  SAMPLE_PHOTOS_THREE,
  SAMPLE_PHOTOS_TWO,
  setupResults,
  shot,
  summarize,
} from './helpers.mjs'

const DISPLAY_MS = 60_000
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

// --- 1. Auto-advance ---
{
  const page = await context.newPage()
  await mockPhotoLibrary(page, SAMPLE_PHOTOS_THREE)
  await mockPhotoImages(page)
  // Install fake clock before timers are created in the app.
  await page.clock.install()
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await waitForSlideReady(page)
  const firstId = await currentPhotoId(page)
  await page.clock.fastForward(DISPLAY_MS)
  await waitForSlideReady(page)
  const nextId = await currentPhotoId(page)
  const changed = nextId !== firstId
  await shot(page, 'slide-01-auto-advance.png')
  record(
    results,
    'Auto-advance changes photo after display interval',
    changed,
    changed ? `${firstId} → ${nextId}` : `stuck on ${firstId}`,
  )
  await page.close()
}

// --- 2. Pause while image loading ---
{
  const page = await context.newPage()
  await mockPhotoLibrary(page, SAMPLE_PHOTOS_TWO)
  await mockPhotoImages(page, { delayMs: 3000 })
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-photo-id][data-status="loading"]').waitFor({ timeout: 5000 })
  const idWhileLoading = await currentPhotoId(page)
  await page.clock.install()
  await page.clock.fastForward(DISPLAY_MS)
  const unchangedWhileLoading =
    (await currentPhotoId(page)) === idWhileLoading &&
    (await page.locator('[data-status="loading"]').count()) > 0
  await waitForSlideReady(page, 15000)
  const idAfterReady = await currentPhotoId(page)
  await page.clock.fastForward(DISPLAY_MS)
  const changedAfterReady = await page
    .waitForFunction(
      (id) => {
        const el = document.querySelector('[data-photo-id]')
        return el && el.getAttribute('data-photo-id') !== id
      },
      idAfterReady,
      { timeout: 5000 },
    )
    .then(() => true)
    .catch(() => false)
  await shot(page, 'slide-02-pause-while-loading.png')
  record(
    results,
    'Timer does not advance while image is loading',
    unchangedWhileLoading,
  )
  record(results, 'Timer advances after image becomes ready', changedAfterReady)
  await page.close()
}

// --- 3. Multi-photo cycle ---
{
  const page = await context.newPage()
  await mockPhotoLibrary(page, SAMPLE_PHOTOS_THREE)
  await mockPhotoImages(page)
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await waitForSlideReady(page)
  await page.clock.install()
  const seen = new Set([await currentPhotoId(page)])
  await page.clock.fastForward(DISPLAY_MS)
  await waitForSlideReady(page)
  seen.add(await currentPhotoId(page))
  await page.clock.fastForward(DISPLAY_MS)
  await waitForSlideReady(page)
  seen.add(await currentPhotoId(page))
  const distinct = seen.size >= 2
  await shot(page, 'slide-03-multi-photo.png')
  record(
    results,
    'Two advances show at least two distinct photos',
    distinct,
    `seen=${[...seen].join(',')}`,
  )
  await page.close()
}

// --- 4. Empty library ---
{
  const page = await context.newPage()
  await mockPhotoLibrary(page, [])
  await mockPhotoImages(page)
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.clock.install()
  const noDisplay = (await page.locator('[data-photo-id]').count()) === 0
  await page.clock.fastForward(DISPLAY_MS * 2)
  const stillNoDisplay = (await page.locator('[data-photo-id]').count()) === 0
  await shot(page, 'slide-04-empty.png')
  record(results, 'Empty library does not show slideshow', noDisplay)
  record(results, 'Empty library does not advance after clock forward', stillNoDisplay)
  await page.close()
}

await browser.close()
summarize(results)
