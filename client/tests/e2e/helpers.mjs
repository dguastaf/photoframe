import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DateTime } from 'luxon'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const outDir = path.join(__dirname, 'screenshots')
export const baseUrl = process.env.CLIENT_URL ?? 'http://localhost:6389'

/** 1×1 PNG for mocked image responses */
export const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z4BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

export const SAMPLE_PHOTOS_ONE = [
  {
    id: 'e2e-photo-1',
    taken_at: '2026-04-26T11:25:59+00:00',
    folder: 'e2e/a',
  },
]

export const SAMPLE_PHOTOS_TWO = [
  {
    id: 'e2e-photo-1',
    taken_at: '2026-04-26T11:25:59+00:00',
    folder: 'e2e/a',
  },
  {
    id: 'e2e-photo-2',
    taken_at: '2026-04-27T11:25:59+00:00',
    folder: 'e2e/b',
  },
]

export const SAMPLE_PHOTOS_THREE = [
  ...SAMPLE_PHOTOS_TWO,
  {
    id: 'e2e-photo-3',
    taken_at: '2026-04-28T11:25:59+00:00',
    folder: 'e2e/c',
  },
]

/** Two photos for tap overlay metadata assertions. */
export const SAMPLE_PHOTOS_OVERLAY = [
  {
    id: 'e2e-photo-1',
    taken_at: '2026-04-26T11:25:59+00:00',
    folder: 'e2e/a',
  },
  {
    id: 'e2e-photo-2',
    taken_at: '2026-04-27T11:25:59+00:00',
    folder: 'e2e/b',
  },
]

/** Match PhotoInfoOverlay date formatting for E2E assertions. */
export function formatTakenAtLabel(takenAt) {
  const capture = DateTime.fromISO(takenAt, { setZone: true })
  if (!capture.isValid) {
    return takenAt
  }
  const locale =
    typeof navigator !== 'undefined'
      ? navigator.language
      : Intl.DateTimeFormat().resolvedOptions().locale
  return capture.setLocale(locale).toLocaleString({
    dateStyle: 'long',
    timeStyle: 'short',
  })
}

export function isPhotoListRequest(url, method) {
  return (
    method === 'GET' &&
    url.includes('/api/v0/photos') &&
    !url.includes('/image')
  )
}

export function isPhotoImageRequest(url, method) {
  return method === 'GET' && /\/api\/v0\/photos\/[^/]+\/image/.test(url)
}

export function setupResults() {
  fs.mkdirSync(outDir, { recursive: true })
  const results = []
  return results
}

export function record(results, name, passed, detail = '') {
  results.push({ name, passed, detail })
  const mark = passed ? 'PASS' : 'FAIL'
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ''}`)
}

export async function shot(page, filename) {
  const filePath = path.join(outDir, filename)
  await page.screenshot({ path: filePath, fullPage: true })
  return filePath
}

export function summarize(results) {
  const failed = results.filter((r) => !r.passed)
  console.log('\n--- Summary ---')
  console.log(`${results.length - failed.length}/${results.length} passed`)
  if (failed.length) {
    console.log('Failed:')
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`)
    process.exit(1)
  }
}

export async function mockPhotoLibrary(page, photos) {
  await page.route(/\/api\/v0\/photos\/?(\?.*)?$/, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(photos),
    })
  })
}

export async function mockPhotoImages(page, { delayMs = 0 } = {}) {
  await page.route(/\/api\/v0\/photos\/[^/]+\/image/, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs))
    }
    await route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: TINY_PNG,
    })
  })
}
