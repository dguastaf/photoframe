#!/usr/bin/env node
/**
 * Capture UI screenshots and flow videos for PRs.
 * Usage: node capture.mjs [--mode screenshot|video|all]
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

const apiPathsText = await readFile(join(ROOT, 'config/api-paths.ts'), 'utf8')
const photosPathMatch = apiPathsText.match(/PHOTOS_PATH = `([^`]+)`/)
const PHOTOS_PATH = photosPathMatch?.[1] ?? '/api/v0/photos'

const SAMPLE_PHOTOS = [
  {
    id: 'ui-preview-photo-1',
    taken_at: '2026-04-26T11:25:59Z',
    folder: 'ui-preview/sample',
  },
]

/** 1×1 PNG for mocked image responses */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z4BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

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
  await page.route(`**${PHOTOS_PATH}**`, async (route) => {
    const url = route.request().url()
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    if (url.includes('/image')) {
      await route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: TINY_PNG,
      })
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
}

async function waitForPhotoReady(page) {
  await page.getByText('Loading photos…').waitFor({ timeout: 8000 }).catch(() => {})
  await page.waitForFunction(
    () => {
      const img = document.querySelector('.photo-display__img')
      return img instanceof HTMLImageElement && !img.hidden
    },
    { timeout: 20_000 },
  )
  await page.waitForTimeout(400)
}

async function captureVideoPlaywright(browser) {
  await mkdir(OUT_DIR, { recursive: true })
  const videoDir = join(OUT_DIR, '.recordings')
  await rm(videoDir, { recursive: true, force: true })
  await mkdir(videoDir, { recursive: true })

  const context = await browser.newContext({
    recordVideo: { dir: videoDir, size: { width: 1280, height: 720 } },
  })
  const page = await context.newPage()
  await installPhotoRoutes(page, { libraryDelayMs: 1200 })
  await page.goto(CLIENT_URL, { waitUntil: 'domcontentloaded' })
  await waitForPhotoReady(page)
  await page.waitForTimeout(1000)
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

  const page = await browser.newPage()
  await installPhotoRoutes(page, { libraryDelayMs: 1200 })
  await page.goto(CLIENT_URL, { waitUntil: 'domcontentloaded' })
  for (let i = 0; i < 12; i++) {
    await page.screenshot({
      path: join(framesDir, `frame-${String(i).padStart(3, '0')}.png`),
    })
    await page.waitForTimeout(250)
  }
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
    console.warn('Playwright ffmpeg unavailable; falling back to frame capture + system ffmpeg')
    return captureVideoFrames(browser)
  }
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

async function main() {
  let dev
  const assets = []

  try {
    dev = await runDevServer()
    const browser = await launchBrowser(chromium)
    try {
      if (mode === 'screenshot' || mode === 'all') {
        const page = await browser.newPage()
        await installPhotoRoutes(page)
        await page.goto(CLIENT_URL, { waitUntil: 'domcontentloaded' })
        await waitForPhotoReady(page)
        const path = await captureScreenshot(page)
        assets.push({
          type: 'screenshot',
          path: '.github/ui-preview/app-shell.png',
          description: 'Fullscreen photo frame with first library photo displayed',
        })
        await page.close()
        console.log(`screenshot: ${path}`)
      }

      if (mode === 'video' || mode === 'all') {
        const path = await captureVideo(browser)
        assets.push({
          type: 'video',
          path: '.github/ui-preview/app-flow.webm',
          description: 'Library loading → first photo displayed',
        })
        console.log(`video: ${path}`)
      }
    } finally {
      await browser.close()
    }

    await writeManifest(assets)
    console.log(`manifest: ${join(OUT_DIR, 'manifest.json')}`)
  } finally {
    dev?.kill('SIGTERM')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
