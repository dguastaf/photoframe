/**
 * Settings navigation E2E: gear → /settings → back preserves same photo; single list fetch.
 */
import { chromium } from 'playwright'
import {
  baseUrl,
  formatTakenAtLabel,
  isPhotoListRequest,
  mockPhotoImages,
  mockPhotoLibrary,
  normalizeDateLabel,
  record,
  SAMPLE_PHOTOS_OVERLAY,
  setupResults,
  summarize,
} from './helpers.mjs'

const VIEWPORT = { width: 1280, height: 720 }

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

async function openOverlay(page) {
  await page.locator('main.frame').click()
  await page.locator('[data-overlay-visible="true"]').waitFor({ timeout: 5000 })
}

function trackPhotoListRequests(page) {
  let count = 0
  page.on('request', (request) => {
    if (isPhotoListRequest(request.url(), request.method())) {
      count += 1
    }
  })
  return {
    get count() {
      return count
    },
  }
}

async function expectedDateLabel(page) {
  const photoId = await page.locator('[data-photo-id]').getAttribute('data-photo-id')
  const photo = SAMPLE_PHOTOS_OVERLAY.find((entry) => entry.id === photoId)
  if (!photo) {
    throw new Error(`unknown photo id ${photoId}`)
  }
  return formatTakenAtLabel(photo.taken_at)
}

// --- 1. Gear → settings → browser back → same photo ---
{
  const page = await context.newPage()
  const listRequests = trackPhotoListRequests(page)
  await mockPhotoLibrary(page, SAMPLE_PHOTOS_OVERLAY)
  await mockPhotoImages(page)
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await waitForSlideReady(page)
  await page.waitForTimeout(300)

  const listRequestsAfterLoad = listRequests.count
  const dateBefore = normalizeDateLabel(await expectedDateLabel(page))
  await openOverlay(page)

  await page.getByRole('link', { name: 'Settings' }).click()
  await page.waitForURL('**/settings')
  await page.getByRole('heading', { name: 'Settings' }).waitFor()

  await page.goBack()
  await waitForSlideReady(page)

  const dateAfterBack = normalizeDateLabel(await expectedDateLabel(page))
  const samePhoto = dateBefore === dateAfterBack
  record(
    results,
    'browser back from settings preserves current photo',
    samePhoto,
    `before=${dateBefore} after=${dateAfterBack}`,
  )

  const noListRefetchOnNavigation = listRequests.count === listRequestsAfterLoad
  record(
    results,
    'no photo list refetch when navigating to settings and back',
    noListRefetchOnNavigation,
    `afterLoad=${listRequestsAfterLoad} afterNav=${listRequests.count}`,
  )

  await page.close()
}

// --- 2. Gear → settings → back link → same photo ---
{
  const page = await context.newPage()
  await mockPhotoLibrary(page, SAMPLE_PHOTOS_OVERLAY)
  await mockPhotoImages(page)
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await waitForSlideReady(page)

  const dateBefore = normalizeDateLabel(await expectedDateLabel(page))
  await openOverlay(page)

  await page.getByRole('link', { name: 'Settings' }).click()
  await page.waitForURL('**/settings')

  await page.getByRole('link', { name: 'Back to slideshow' }).click()
  await waitForSlideReady(page)

  const dateAfterLink = normalizeDateLabel(await expectedDateLabel(page))
  record(
    results,
    'back link from settings preserves current photo',
    dateBefore === dateAfterLink,
    `before=${dateBefore} after=${dateAfterLink}`,
  )

  await page.close()
}

await browser.close()
summarize(results)
