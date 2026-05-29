/**
 * Tap overlay E2E: toggle metadata, swipe closes overlay, metadata updates.
 */
import { chromium } from 'playwright'
import {
  baseUrl,
  formatTakenAtLabel,
  normalizeDateLabel,
  mockPhotoImages,
  mockPhotoLibrary,
  record,
  SAMPLE_PHOTOS_OVERLAY,
  setupResults,
  shot,
  summarize,
} from './helpers.mjs'

const VIEWPORT = { width: 1280, height: 720 }
const SWIPE_THRESHOLD_VW = 0.0375
const SWIPE_OVERSHOOT_VW = 0.03125
const FRAME_EDGE_MARGIN_VW = 0.0625

function swipeDistanceForViewport(width) {
  return width * SWIPE_THRESHOLD_VW
}

const results = setupResults()
const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: VIEWPORT,
  colorScheme: 'dark',
  locale: 'en-US',
})

async function waitForSlideReady(page, timeout = 15000) {
  await page.locator('.photo-display__img:not([hidden])').waitFor({ timeout })
}

async function waitForOverlayHidden(page) {
  await page.waitForFunction(
    () => document.querySelectorAll('[data-overlay-visible="true"]').length === 0,
    undefined,
    { timeout: 5000 },
  )
}

async function currentPhotoId(page) {
  return page.locator('[data-photo-id]').getAttribute('data-photo-id')
}

function photoMeta(photoId) {
  const photo = SAMPLE_PHOTOS_OVERLAY.find((entry) => entry.id === photoId)
  if (!photo) {
    throw new Error(`unknown photo id ${photoId}`)
  }
  return photo
}

async function swipeHorizontal(page, direction) {
  const box = await page.locator('main.frame').boundingBox()
  if (!box) throw new Error('frame not found')
  const y = box.y + box.height / 2
  const margin = VIEWPORT.width * FRAME_EDGE_MARGIN_VW
  const distance = swipeDistanceForViewport(VIEWPORT.width) + VIEWPORT.width * SWIPE_OVERSHOOT_VW
  const fromX =
    direction === 'left' ? box.x + box.width - margin : box.x + margin
  const toX = direction === 'left' ? fromX - distance : fromX + distance
  await page.mouse.move(fromX, y)
  await page.mouse.down()
  await page.mouse.move(toX, y, { steps: 12 })
  await page.mouse.up()
}

// --- 1. Tap toggles overlay metadata ---
{
  const page = await context.newPage()
  await mockPhotoLibrary(page, SAMPLE_PHOTOS_OVERLAY)
  await mockPhotoImages(page)
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await waitForSlideReady(page)

  const firstId = await currentPhotoId(page)
  const firstPhoto = photoMeta(firstId)
  const expectedDate = formatTakenAtLabel(firstPhoto.taken_at)

  const overlay = page.locator('[data-overlay-visible="true"]')
  await page.locator('main.frame').click()
  await overlay.waitFor()
  const dateVisible = await overlay.locator('.photo-info-overlay__date').textContent()
  const folderVisible = await overlay.locator('.photo-info-overlay__folder').textContent()
  const toggleOk =
    normalizeDateLabel(dateVisible ?? '') === expectedDate &&
    folderVisible === firstPhoto.folder

  await page.locator('main.frame').click()
  await waitForOverlayHidden(page)
  const hiddenOk = (await page.locator('[data-overlay-visible="true"]').count()) === 0

  await shot(page, 'tap-overlay-01-toggle.png')
  record(
    results,
    'Tap toggles overlay date and folder',
    toggleOk && hiddenOk,
    toggleOk
      ? `date=${dateVisible} folder=${folderVisible}`
      : `date=${dateVisible} folder=${folderVisible}`,
  )
  await page.close()
}

// --- 2. Swipe closes overlay; re-open shows new photo metadata ---
{
  const page = await context.newPage()
  await mockPhotoLibrary(page, SAMPLE_PHOTOS_OVERLAY)
  await mockPhotoImages(page)
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await waitForSlideReady(page)
  const firstId = await currentPhotoId(page)

  await page.locator('main.frame').click()
  await page.locator('[data-overlay-visible="true"]').waitFor()

  await swipeHorizontal(page, 'left')
  await waitForSlideReady(page)
  const secondId = await currentPhotoId(page)
  const overlayHidden = (await page.locator('[data-overlay-visible="true"]').count()) === 0

  await page.locator('main.frame').click()
  await page.locator('[data-overlay-visible="true"]').waitFor()
  const dateAfterSwipe = await page
    .locator('.photo-info-overlay__date')
    .textContent()
  const folderAfterSwipe = await page
    .locator('.photo-info-overlay__folder')
    .textContent()
  const secondPhoto = photoMeta(secondId)
  const expectedSecondDate = formatTakenAtLabel(secondPhoto.taken_at)
  const metadataOk =
    secondId !== firstId &&
    normalizeDateLabel(dateAfterSwipe ?? '') === expectedSecondDate &&
    folderAfterSwipe === secondPhoto.folder

  await shot(page, 'tap-overlay-02-swipe-close.png')
  record(
    results,
    'Swipe while overlay open hides overlay and updates metadata on re-open',
    overlayHidden && metadataOk,
    overlayHidden
      ? `${firstId} → ${secondId}; ${dateAfterSwipe} / ${folderAfterSwipe}`
      : `overlay still visible after swipe`,
  )
  await page.close()
}

await browser.close()
summarize(results)
