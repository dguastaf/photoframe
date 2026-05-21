#!/usr/bin/env node
/**
 * Validates ui-preview assets are present and large enough to be useful in PRs.
 * Usage: node validate.mjs [--require screenshot|video|all]
 */
import { access, stat } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const ROOT = resolve(__dirname, '../..')
const OUT_DIR = join(ROOT, '.github/ui-preview')

/** VP9 WebM is small; duration (ffprobe) is the primary gate for slideshow flows. */
const MIN_WEBM_BYTES = 18_000
/** Dark fullscreen frame with 1×1 mock image compresses heavily. */
const MIN_PNG_BYTES = 3_500
/** When ffprobe is available, require at least this many seconds of video. */
const MIN_WEBM_SECONDS = 4

const mode = (() => {
  const idx = process.argv.indexOf('--require')
  return idx >= 0 ? process.argv[idx + 1] : 'all'
})()

async function fileSize(path) {
  const s = await stat(path)
  return s.size
}

async function fileExists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function probeDurationSeconds(webmPath) {
  return new Promise((resolve) => {
    const child = spawn(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        webmPath,
      ],
      { stdio: ['ignore', 'pipe', 'ignore'] },
    )
    let out = ''
    child.stdout.on('data', (d) => {
      out += d
    })
    child.on('close', (code) => {
      if (code !== 0) {
        resolve(null)
        return
      }
      const sec = parseFloat(out.trim())
      resolve(Number.isFinite(sec) ? sec : null)
    })
    child.on('error', () => resolve(null))
  })
}

async function checkAsset(label, path, minBytes, extraChecks) {
  const errors = []
  if (!(await fileExists(path))) {
    errors.push(`${label} missing: ${path}`)
    return errors
  }
  const bytes = await fileSize(path)
  if (bytes < minBytes) {
    errors.push(
      `${label} too small (${bytes} bytes, need >= ${minBytes}): ${path}. Re-run capture — likely truncated or wrong flow.`,
    )
  }
  if (extraChecks) {
    errors.push(...(await extraChecks(path, bytes)))
  }
  return errors
}

async function main() {
  const needScreenshot = mode === 'screenshot' || mode === 'all'
  const needVideo = mode === 'video' || mode === 'all'
  const errors = []

  if (needScreenshot) {
    errors.push(
      ...(await checkAsset(
        'app-shell.png',
        join(OUT_DIR, 'app-shell.png'),
        MIN_PNG_BYTES,
        null,
      )),
    )
  }

  if (needVideo) {
    errors.push(
      ...(await checkAsset(
        'app-flow.webm',
        join(OUT_DIR, 'app-flow.webm'),
        MIN_WEBM_BYTES,
        async (path) => {
          const extra = []
          const duration = await probeDurationSeconds(path)
          if (duration != null && duration < MIN_WEBM_SECONDS) {
            extra.push(
              `app-flow.webm too short (${duration.toFixed(1)}s, need >= ${MIN_WEBM_SECONDS}s). Re-run \`cd client && npm run ui:video\` with slideshow visible.`,
            )
          }
          return extra
        },
      )),
    )
  }

  if (errors.length) {
    console.error('UI preview validation failed:\n')
    for (const e of errors) console.error(`  - ${e}`)
    console.error('\nFix: cd client && npm run ui:preview')
    process.exit(1)
  }

  console.log('UI preview assets OK')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
