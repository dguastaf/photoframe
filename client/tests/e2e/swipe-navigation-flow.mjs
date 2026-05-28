/**
 * Swipe / keyboard navigation E2E: manual forward and back through shuffle.
 */
import { chromium } from 'playwright'
import {
  baseUrl,
  mockPhotoImages,
  mockPhotoLibrary,
  record,
  SAMPLE_PHOTOS_THREE,
  setupResults,
  shot,
  summarize,
} from './helpers.mjs'

const SWIPE_THRESHOLD = 48
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

async function swipeHorizontal(page, direction) {
  const box = await page.locator('main.frame').boundingBox()
  if (!box) throw new Error('frame not found')
  const y = box.y + box.height / 2
  const margin = 80
  const distance = SWIPE_THRESHOLD + 40
  const fromX =
    direction === 'left' ? box.x + box.width - margin : box.x + margin
  const toX = direction === 'left' ? fromX - distance : fromX + distance
  await page.mouse.move(fromX, y)
  await page.mouse.down()
  await page.mouse.move(toX, y, { steps: 12 })
  await page.mouse.up()
}

// --- 1. Swipe forward ---
{
  const page = await context.newPage()
  await mockPhotoLibrary(page, SAMPLE_PHOTOS_THREE)
  await mockPhotoImages(page)
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await waitForSlideReady(page)
  const firstId = await currentPhotoId(page)
  await swipeHorizontal(page, 'left')
  await waitForSlideReady(page)
  const secondId = await currentPhotoId(page)
  const forwardOk = secondId !== firstId
  await shot(page, 'swipe-01-forward.png')
  record(
    results,
    'Swipe left advances to next photo',
    forwardOk,
    forwardOk ? `${firstId} → ${secondId}` : `stuck on ${firstId}`,
  )
  await page.close()
}

// --- 2. Swipe backward ---
{
  const page = await context.newPage()
  await mockPhotoLibrary(page, SAMPLE_PHOTOS_THREE)
  await mockPhotoImages(page)
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await waitForSlideReady(page)
  const firstId = await currentPhotoId(page)
  await swipeHorizontal(page, 'left')
  await waitForSlideReady(page)
  await swipeHorizontal(page, 'right')
  await waitForSlideReady(page)
  const backId = await currentPhotoId(page)
  const backOk = backId === firstId
  await shot(page, 'swipe-02-back.png')
  record(
    results,
    'Swipe right returns to previous photo',
    backOk,
    backOk ? `restored ${firstId}` : `${firstId} vs ${backId}`,
  )
  await page.close()
}

// --- 3. Arrow keys ---
{
  const page = await context.newPage()
  await mockPhotoLibrary(page, SAMPLE_PHOTOS_THREE)
  await mockPhotoImages(page)
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await waitForSlideReady(page)
  const firstId = await currentPhotoId(page)
  await page.keyboard.press('ArrowRight')
  await waitForSlideReady(page)
  const nextId = await currentPhotoId(page)
  const keyForwardOk = nextId !== firstId
  await page.keyboard.press('ArrowLeft')
  await waitForSlideReady(page)
  const restoredId = await currentPhotoId(page)
  const keyBackOk = restoredId === firstId
  const keysOk = keyForwardOk && keyBackOk
  await shot(page, 'swipe-03-keys.png')
  record(
    results,
    'Arrow keys navigate forward and back',
    keysOk,
    keysOk
      ? `${firstId} → ${nextId} → ${restoredId}`
      : `forward=${keyForwardOk} back=${keyBackOk}`,
  )
  await page.close()
}

await browser.close()
summarize(results)
