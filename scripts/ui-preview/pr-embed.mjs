#!/usr/bin/env node
/**
 * Print PR description markdown for ui-preview assets.
 * Flow GIF uses raw.githubusercontent.com (renders inline in PR bodies).
 *
 * Usage: node pr-embed.mjs [--branch NAME]
 */
import { access } from 'node:fs/promises'
import { execSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../..')
const FLOW_GIF = join(ROOT, '.github/ui-preview/app-flow.gif')

/** Markdown image hrefs to .github/ui-preview break in PR descriptions. */
export const FORBIDDEN_PR_IMAGE_RE =
  /!\[[^]]*\]\(\.github\/ui-preview\/[^)]+\)/

/** Repo links to video files do not render as inline players in PR descriptions. */
export const FORBIDDEN_PR_VIDEO_LINK_RE =
  /https:\/\/(?:raw\.githubusercontent\.com\/[^/]+\/[^/]+\/[^)\s]+|github\.com\/[^/]+\/[^/]+\/(?:blob|raw)\/[^)\s]+)\/\.github\/ui-preview\/app-flow\.(?:webm|mp4)/

export function parseGitHubRepo(cwd = ROOT) {
  let url
  try {
    url = execSync('git remote get-url origin', { cwd, encoding: 'utf8' }).trim()
  } catch {
    throw new Error('Could not read git remote origin')
  }
  const match = url.match(/github\.com[:/]([^/]+)\/([^/.]+?)(?:\.git)?\/?$/i)
  if (!match) {
    throw new Error(`Origin is not a github.com remote: ${url}`)
  }
  return { owner: match[1], repo: match[2] }
}

export function currentBranch(cwd = ROOT) {
  if (process.env.GITHUB_HEAD_REF) return process.env.GITHUB_HEAD_REF
  return execSync('git rev-parse --abbrev-ref HEAD', { cwd, encoding: 'utf8' }).trim()
}

export async function flowGifExists() {
  try {
    await access(FLOW_GIF)
    return true
  } catch {
    return false
  }
}

export function buildPrEmbed({ owner, repo, branch }) {
  const rawGif = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/.github/ui-preview/app-flow.gif`
  return ['## UI preview', '', `![UI flow](${rawGif})`, ''].join('\n')
}

export function assertNoRelativePreviewImages(markdown, label = 'text') {
  if (FORBIDDEN_PR_IMAGE_RE.test(markdown)) {
    throw new Error(
      `${label} uses a relative .github/ui-preview/ image link. ` +
        'GitHub PR descriptions require raw.githubusercontent.com. ' +
        'Run: cd client && npm run ui:embed',
    )
  }
}

export function assertNoRepoVideoLinks(markdown, label = 'text') {
  if (FORBIDDEN_PR_VIDEO_LINK_RE.test(markdown)) {
    throw new Error(
      `${label} links to app-flow.webm/mp4 in the repo. ` +
        'Use the app-flow.gif embed from npm run ui:embed instead. ' +
        'Run: cd client && npm run ui:embed',
    )
  }
}

export async function printPrEmbedInstructions(branch = currentBranch()) {
  const hasGif = await flowGifExists()
  if (!hasGif) {
    throw new Error(
      'Missing .github/ui-preview/app-flow.gif — run: cd client && npm run ui:preview',
    )
  }
  const { owner, repo } = parseGitHubRepo()
  const block = buildPrEmbed({ owner, repo, branch })
  console.log('--- Paste into PR description (UI preview) ---\n')
  console.log(block)
  console.log(
    '---\nUse raw.githubusercontent.com URLs only (from npm run ui:embed).\n',
  )
  return block
}

function parseArgs() {
  const idx = process.argv.indexOf('--branch')
  return idx >= 0 ? process.argv[idx + 1] : currentBranch()
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href

if (isMain) {
  printPrEmbedInstructions(parseArgs()).catch((err) => {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  })
}
