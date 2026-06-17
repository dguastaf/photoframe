#!/usr/bin/env node
/**
 * Capture UI screenshots and flow videos for PRs.
 * Usage: node capture.mjs [--mode screenshot|video|all]
 *
 * Video records: first photo ready → arrow forward → arrow back (no loading spinner).
 */
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../..')
const CLIENT = join(ROOT, 'client')
const require = createRequire(join(CLIENT, 'package.json'))
const { chromium } = require('playwright')
const OUT_DIR = join(ROOT, '.github/ui-preview')
const PORTS = JSON.parse(
  await readFile(join(ROOT, 'config/ports.json'), 'utf8'),
)
const CLIENT_URL = `http://${PORTS.clientDevHost}:${PORTS.clientDevPort}`

const FIXTURES_DIR = join(__dirname, 'fixtures')
const FIXTURE_COUNT = 15

/** Matches slideshow E2E — enough photos for library + auto-advance preview. */
const SAMPLE_PHOTOS = Array.from({ length: FIXTURE_COUNT }, (_, i) => ({
  id: `ui-preview-photo-${i + 1}`,
  taken_at: new Date(Date.UTC(2026, 3, 26 + i, 11, 25, 59))
    .toISOString()
    .replace('Z', '+00:00'),
  folder: `ui-preview/${String(i + 1).padStart(2, '0')}`,
}))

/** License-free landscape fixtures — see fixtures/sources.json. */
const MOCK_IMAGE_BODIES = Object.fromEntries(
  await Promise.all(
    SAMPLE_PHOTOS.map(async (photo, i) => {
      const buf = await readFile(join(FIXTURES_DIR, `mock-photo-${i + 1}.jpg`))
      return [photo.id, buf]
    }),
  ),
)

const VIEWPORT_WIDTH = 1280
/** Dwell so prefetch can warm the next slide; keep short for a tight PR GIF. */
const PREFETCH_DWELL_MS = 1200
const SLIDE_DWELL_MS = 1800

/** Real wall-clock sleep (safe while recording video; page.waitForTimeout uses fake clock). */
function wallSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const mode = (() => {
  const idx = process.argv.indexOf('--mode')
  return idx >= 0 ? process.argv[idx + 1] : 'all'
})()

async function listUiFiles(dir, acc = []) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist') {
        await listUiFiles(full, acc)
      }
    } else if (/\.(tsx|ts|css|html|svg)$/.test(entry.name)) {
      acc.push(full)
    }
  }
  return acc
}

async function hashUiFiles() {
  const roots = [
    join(ROOT, 'client/src'),
    join(ROOT, 'client/public'),
    join(ROOT, 'client/index.html'),
  ]
  const files = []
  const { stat } = await import('node:fs/promises')
  for (const root of roots) {
    try {
      const st = await stat(root)
      if (st.isFile()) files.push(root)
      else await listUiFiles(root, files)
    } catch {
      /* optional paths */
    }
  }
  files.sort()
  const hash = createHash('sha256')
  for (const full of files) {
    const rel = full.slice(ROOT.length + 1)
    const buf = await readFile(full)
    hash.update(rel)
    hash.update(buf)
  }
  return hash.digest('hex').slice(0, 16)
}

async function gitHead() {
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['rev-parse', 'HEAD'], { cwd: ROOT })
    let out = ''
    child.stdout.on('data', (d) => {
      out += d
    })
    child.on('close', (code) => {
      if (code === 0) resolve(out.trim())
      else reject(new Error('git rev-parse failed'))
    })
    child.on('error', () => reject(new Error('git not found')))
  })
}

function runDevServer() {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', 'dev', '--', '--host'], {
      cwd: CLIENT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, BROWSER: 'none' },
    })
    let settled = false
    let timeout
    let output = ''
    const fail = (err) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      child.kill('SIGTERM')
      reject(err)
    }
    const onData = (chunk) => {
      const text = chunk.toString()
      if (!settled) output += text
      if (!settled && text.includes('Local:')) {
        settled = true
        clearTimeout(timeout)
        resolve(child)
      }
    }
    child.stdout.on('data', onData)
    child.stderr.on('data', onData)
    child.on('error', fail)
    child.on('close', (code, signal) => {
      if (settled) return
      const detail = output.trim().slice(-800)
      const reason =
        code != null && code !== 0
          ? `exited with code ${code}`
          : signal
            ? `terminated by signal ${signal}`
            : 'exited before ready'
      fail(
        new Error(
          `Vite dev server ${reason}${detail ? `\n${detail}` : ''}`,
        ),
      )
    })
    timeout = setTimeout(() => {
      fail(new Error('Vite dev server did not start in time'))
    }, 30_000)
  })
}

async function captureScreenshot(page) {
  await mkdir(OUT_DIR, { recursive: true })
  const path = join(OUT_DIR, 'app-shell.png')
  await page.screenshot({ path, fullPage: true })
  return path
}

async function installPhotoRoutes(page, { libraryDelayMs = 0 } = {}) {
  await page.route(/\/api\/v0\/photos\/?(\?.*)?$/, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    if (libraryDelayMs > 0) {
      await new Promise((r) => setTimeout(r, libraryDelayMs))
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(SAMPLE_PHOTOS),
    })
  })

  await page.route(/\/api\/v0\/photos\/[^/]+\/image/, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    const idMatch = route.request().url().match(/\/photos\/([^/?]+)\/image/)
    const photoId = idMatch?.[1]
    const body =
      (photoId && MOCK_IMAGE_BODIES[photoId]) ||
      MOCK_IMAGE_BODIES[SAMPLE_PHOTOS[0].id]
    await route.fulfill({
      status: 200,
      contentType: 'image/jpeg',
      body,
    })
  })
}

async function waitForSlideReady(page, timeout = 20_000) {
  await page.getByText('Loading photos…').waitFor({ timeout: 8000 }).catch(() => {})
  await page.locator('[data-photo-id][data-status="ready"]').waitFor({ timeout })
  await page.waitForTimeout(300)
}

async function waitForSlideChange(page, previousId, timeout = 10_000) {
  await page.waitForFunction(
    (id) => {
      const el = document.querySelector('[data-photo-id]')
      return el && el.getAttribute('data-photo-id') !== id
    },
    previousId,
    { timeout },
  )
  await waitForSlideReady(page)
}

async function assertNoPhotoSpinner(page) {
  const count = await page.getByRole('status', { name: 'Loading photo' }).count()
  if (count > 0) {
    throw new Error('Loading photo spinner visible during UI preview capture')
  }
}

/** Wait for ready slide, confirm no spinner, dwell for recording. */
async function dwellOnReadySlide(page, dwellMs = SLIDE_DWELL_MS) {
  await page.locator('[data-photo-id][data-status="ready"]').waitFor({ timeout: 20_000 })
  await page.locator('.photo-display__img:not([hidden])').waitFor({ timeout: 20_000 })
  await assertNoPhotoSpinner(page)
  await wallSleep(dwellMs)
}

/**
 * Arrow-key forward/back through slides after prefetch dwell — asserts no loading spinner.
 */
async function showKeyboardNavigationRoundTrip(page, { onStep } = {}) {
  const step = onStep ?? (async () => {})

  await dwellOnReadySlide(page, PREFETCH_DWELL_MS)
  await step()
  const firstId = await page.locator('[data-photo-id]').getAttribute('data-photo-id')

  await page.keyboard.press('ArrowRight')
  await waitForSlideChange(page, firstId)
  await dwellOnReadySlide(page, PREFETCH_DWELL_MS)
  await step()
  const secondId = await page.locator('[data-photo-id]').getAttribute('data-photo-id')
  if (!secondId || secondId === firstId) {
    throw new Error('ArrowRight did not advance to the next photo')
  }

  await page.keyboard.press('ArrowLeft')
  await waitForSlideChange(page, secondId)
  await dwellOnReadySlide(page, SLIDE_DWELL_MS)
  await step()
  const backId = await page.locator('[data-photo-id]').getAttribute('data-photo-id')
  if (backId !== firstId) {
    throw new Error(`ArrowLeft expected ${firstId}, got ${backId}`)
  }
}

async function captureVideoPlaywright(browser) {
  await mkdir(OUT_DIR, { recursive: true })
  const videoDir = join(OUT_DIR, '.recordings')
  await rm(videoDir, { recursive: true, force: true })
  await mkdir(videoDir, { recursive: true })

  const context = await browser.newContext({
    viewport: { width: VIEWPORT_WIDTH, height: 720 },
    recordVideo: { dir: videoDir, size: { width: 1280, height: 720 } },
  })
  const page = await context.newPage()
  await page.addInitScript(() => {
    Math.random = () => 0
  })
  await installPhotoRoutes(page)
  await page.goto(CLIENT_URL, { waitUntil: 'domcontentloaded' })
  await waitForSlideReady(page)
  await showKeyboardNavigationRoundTrip(page)
  await context.close()

  const entries = await readdir(videoDir)
  const webm = entries.find((e) => e.endsWith('.webm'))
  if (!webm) throw new Error('No recorded video found')
  const src = join(videoDir, webm)
  const dest = join(OUT_DIR, 'app-flow.webm')
  const { rename } = await import('node:fs/promises')
  await rename(src, dest)
  return dest
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', args, { stdio: 'inherit' })
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg exited ${code}`))
    })
    child.on('error', () =>
      reject(new Error('ffmpeg not found — install ffmpeg or run: npx playwright install ffmpeg')),
    )
  })
}

async function captureVideoFrames(browser) {
  await mkdir(OUT_DIR, { recursive: true })
  const framesDir = join(OUT_DIR, '.frames')
  await rm(framesDir, { recursive: true, force: true })
  await mkdir(framesDir, { recursive: true })

  const page = await browser.newPage({ viewport: { width: VIEWPORT_WIDTH, height: 720 } })
  await page.addInitScript(() => {
    Math.random = () => 0
  })
  await installPhotoRoutes(page)
  await page.goto(CLIENT_URL, { waitUntil: 'domcontentloaded' })
  await waitForSlideReady(page)

  let frame = 0
  const snap = async () => {
    await page.screenshot({
      path: join(framesDir, `frame-${String(frame++).padStart(3, '0')}.png`),
    })
  }

  await showKeyboardNavigationRoundTrip(page, {
    onStep: async () => {
      for (let i = 0; i < 5; i++) {
        await snap()
        await wallSleep(400)
      }
    },
  })
  await page.close()

  const dest = join(OUT_DIR, 'app-flow.webm')
  await runFfmpeg([
    '-y',
    '-framerate',
    '4',
    '-i',
    join(framesDir, 'frame-%03d.png'),
    '-c:v',
    'libvpx-vp9',
    '-pix_fmt',
    'yuv420p',
    dest,
  ])
  return dest
}

async function captureVideo(browser) {
  try {
    return await captureVideoPlaywright(browser)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (!/ffmpeg|Executable doesn't exist/i.test(msg)) throw err
    console.warn(
      'Playwright ffmpeg unavailable; falling back to frame capture + system ffmpeg',
    )
    console.warn(
      'For native video recording: cd client && npx playwright install ffmpeg',
    )
    return captureVideoFrames(browser)
  }
}

/** GIF embeds inline in GitHub PR markdown via raw.githubusercontent.com (no manual upload). */
async function exportFlowGif(webmPath) {
  const dest = join(OUT_DIR, 'app-flow.gif')
  await runFfmpeg([
    '-y',
    '-i',
    webmPath,
    '-vf',
    'fps=6,scale=960:-1:flags=lanczos',
    dest,
  ])
  return dest
}

async function writeManifest(assets) {
  const manifest = {
    generatedAt: new Date().toISOString(),
    gitCommit: await gitHead().catch(() => 'unknown'),
    uiFilesHash: await hashUiFiles(),
    assets,
  }
  await writeFile(
    join(OUT_DIR, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  )
}

async function launchBrowser(chromium) {
  const opts = { headless: true }
  try {
    return await chromium.launch(opts)
  } catch {
    return await chromium.launch({ ...opts, channel: 'chrome' })
  }
}

async function runValidation() {
  const validateMode =
    mode === 'all' ? 'all' : mode === 'screenshot' ? 'screenshot' : 'video'
  await new Promise((resolve, reject) => {
    const child = spawn(
      'node',
      [join(ROOT, 'scripts/ui-preview/validate.mjs'), '--require', validateMode],
      { cwd: ROOT, stdio: 'inherit' },
    )
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error('validate failed'))))
    child.on('error', reject)
  })
}

async function devServerAlreadyUp() {
  try {
    const res = await fetch(CLIENT_URL, { signal: AbortSignal.timeout(2000) })
    return res.ok || res.status < 500
  } catch {
    return false
  }
}

async function main() {
  let dev
  const assets = []

  try {
    dev = (await devServerAlreadyUp()) ? null : await runDevServer()
    if (!dev) console.log(`using existing dev server at ${CLIENT_URL}`)
    const browser = await launchBrowser(chromium)
    try {
      if (mode === 'screenshot' || mode === 'all') {
        const page = await browser.newPage()
        await installPhotoRoutes(page)
        await page.goto(CLIENT_URL, { waitUntil: 'domcontentloaded' })
        await waitForSlideReady(page)
        const path = await captureScreenshot(page)
        assets.push({
          type: 'screenshot',
          path: '.github/ui-preview/app-shell.png',
          description: 'Fullscreen slideshow frame with first photo ready',
        })
        await page.close()
        console.log(`screenshot: ${path}`)
      }

      if (mode === 'video' || mode === 'all') {
        const webmPath = await captureVideo(browser)
        const gifPath = await exportFlowGif(webmPath)
        assets.push({
          type: 'video',
          path: '.github/ui-preview/app-flow.webm',
          description:
            'First photo → arrow forward → arrow back without loading spinner',
        })
        assets.push({
          type: 'gif',
          path: '.github/ui-preview/app-flow.gif',
          description:
            'Slideshow forward/back keyboard navigation; embedded in PRs via npm run ui:embed',
        })
        console.log(`video: ${webmPath}`)
        console.log(`gif (PR embed): ${gifPath}`)
      }
    } finally {
      await browser.close()
    }

    await writeManifest(assets)
    console.log(`manifest: ${join(OUT_DIR, 'manifest.json')}`)
    await runValidation()
    if (assets.length > 0) {
      const { printPrEmbedInstructions, currentBranch } = await import('./pr-embed.mjs')
      await printPrEmbedInstructions(currentBranch())
    }
  } finally {
    dev?.kill('SIGTERM')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
