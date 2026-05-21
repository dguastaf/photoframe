/**
 * Manual bug-bash harness: run with API on 52525 and `npm run dev` on 6389.
 * Usage (from client/): npm install --no-save playwright && node e2e/bug-bash.mjs
 */
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, 'screenshots')
const baseUrl = process.env.CLIENT_URL ?? 'http://localhost:6389'
const results = []

fs.mkdirSync(outDir, { recursive: true })

function record(name, passed, detail = '') {
  results.push({ name, passed, detail })
  const mark = passed ? 'PASS' : 'FAIL'
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ''}`)
}

async function shot(page, filename) {
  const filePath = path.join(outDir, filename)
  await page.screenshot({ path: filePath, fullPage: true })
  return filePath
}

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  colorScheme: 'dark',
})

// --- 1. Loading state (delayed library) ---
{
  const page = await context.newPage()
  await page.route('**/api/v0/photos', async (route) => {
    if (route.request().method() !== 'GET' || route.request().url().includes('/image')) {
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
  await shot(page, '01-loading-library.png')
  record('Launch shows loading library', loadingVisible)
  await page.close()
}

// --- 2. Happy path: library + photo ---
{
  const page = await context.newPage()
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  const img = page.locator('.photo-display__img:not([hidden])')
  const ok = await img.waitFor({ timeout: 20000 }).then(() => true).catch(() => false)
  await shot(page, '02-happy-photo-display.png')
  record('Happy path shows photo', ok)
  await page.close()
}

// --- 3. API error on mount ---
{
  const page = await context.newPage()
  await page.route('**/api/v0/photos', async (route) => {
    if (route.request().method() !== 'GET' || route.request().url().includes('/image')) {
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
  await shot(page, '03-api-error-and-empty.png')
  record('API error shows error message', err)
  record('API error also shows empty-library block', noPhotos)
  record('Retry visible on error (no photos loaded)', retry)
  await page.close()
}

// --- 4. Retry after error recovers ---
{
  const page = await context.newPage()
  let fail = true
  await page.route('**/api/v0/photos', async (route) => {
    if (route.request().method() !== 'GET' || route.request().url().includes('/image')) {
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
    await route.continue()
  })
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.getByText('Temporary failure (test)').waitFor({ timeout: 5000 })
  fail = false
  await page.getByRole('button', { name: 'Retry' }).click()
  const recovered = await page
    .locator('.photo-display__img:not([hidden])')
    .waitFor({ timeout: 20000 })
    .then(() => true)
    .catch(() => false)
  await shot(page, '04-retry-after-error.png')
  record('Library Retry recovers to photo', recovered)
  await page.close()
}

// --- 5. Empty library ---
{
  const page = await context.newPage()
  await page.route('**/api/v0/photos', async (route) => {
    if (route.request().method() !== 'GET' || route.request().url().includes('/image')) {
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
  await shot(page, '05-empty-library.png')
  record('Empty library shows no-photos message', empty)
  record('Empty library shows Retry', retry)
  record('Empty library does not show slideshow', noSlideshow)
  await page.close()
}

// --- 6. Retry loading state (library) ---
{
  const page = await context.newPage()
  let mockEmpty = true
  await page.route('**/api/v0/photos', async (route) => {
    if (route.request().method() !== 'GET' || route.request().url().includes('/image')) {
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
  await shot(page, '06-retry-shows-loading.png')
  record('Library Retry shows loading state', loadingAfterRetry)
  await page.close()
}

// --- 7. Rapid double Retry (abort path) ---
{
  const page = await context.newPage()
  let listRequests = 0
  let mockEmpty = true
  await page.route('**/api/v0/photos', async (route) => {
    if (route.request().method() !== 'GET' || route.request().url().includes('/image')) {
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
  // Double-click before UI hides Retry (loading); exercises abort + refreshKey bump
  await retryBtn.dblclick()
  await page.waitForTimeout(300)
  const loading = await page.getByText('Loading photos…').isVisible()
  await shot(page, '07-double-retry-loading.png')
  const settled = await Promise.race([
    page.locator('.photo-display__img:not([hidden])').waitFor({ timeout: 15000 }),
    page.getByText('No photos in library').waitFor({ timeout: 15000 }),
    page.locator('.frame-message__error').waitFor({ timeout: 15000 }),
  ])
    .then(() => true)
    .catch(() => false)
  await shot(page, '07-double-retry-settled.png')
  record('Double library Retry shows loading', loading)
  record('Double library Retry settles without crash', settled)
  record('Double Retry issued multiple list requests', listRequests >= 2, `count=${listRequests}`)
  await page.close()
}

await browser.close()

const failed = results.filter((r) => !r.passed)
console.log('\n--- Summary ---')
console.log(`${results.length - failed.length}/${results.length} passed`)
if (failed.length) {
  console.log('Failed:')
  for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`)
  process.exit(1)
}
