/**
 * Slideshow E2E: auto-advance, prefetch next image, multi-photo cycle, empty library.
 * Fully mocked API routes — dev server on 6389 only (API need not be running).
 */
import { chromium } from 'playwright'
import {
  baseUrl,
  isPhotoImageRequest,
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

// --- 2. Prefetch next image ---
{
  const page = await context.newPage()
  await page.addInitScript(() => {
    Math.random = () => 0
  })
  await mockPhotoLibrary(page, SAMPLE_PHOTOS_THREE)
  const imageRequests = []
  page.on('request', (req) => {
    if (isPhotoImageRequest(req.url(), req.method())) {
      imageRequests.push(req.url())
    }
  })
  await mockPhotoImages(page)
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await waitForSlideReady(page)
  const currentId = await currentPhotoId(page)
  // Math.random=0 shuffle of [photo-1, photo-2, photo-3] => [photo-2, photo-3, photo-1]
  const expectedNextId = 'e2e-photo-3'
  const prefetched = imageRequests.some(
    (url) =>
      url.includes(encodeURIComponent(expectedNextId)) && !url.includes(currentId),
  )
  const currentLoaded = imageRequests.some((url) =>
    url.includes(encodeURIComponent(currentId)),
  )
  await shot(page, 'slide-02-prefetch-next.png')
  record(
    results,
    'Prefetch requests next slide image while current slide is visible',
    prefetched && currentLoaded,
    prefetched
      ? `current=${currentId}, prefetch=${expectedNextId}`
      : `requests=${imageRequests.join('; ')}`,
  )
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
