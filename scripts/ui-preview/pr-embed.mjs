#!/usr/bin/env node
/**
 * Print PR description markdown for ui-preview assets.
 * Screenshot links MUST use raw.githubusercontent.com — relative .github/ paths
 * do not render in GitHub PR descriptions.
 *
 * Usage: node pr-embed.mjs [--branch NAME]
 */
import { execSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../..')

/** Markdown image hrefs to .github/ui-preview break in PR descriptions. */
export const FORBIDDEN_PR_IMAGE_RE =
  /!\[[^]]*\]\(\.github\/ui-preview\/[^)]+\)/

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

export function buildPrEmbed({ owner, repo, branch }) {
  const rawScreenshot = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/.github/ui-preview/app-shell.png`
  const blobVideo = `https://github.com/${owner}/${repo}/blob/${branch}/.github/ui-preview/app-flow.webm`
  return [
    '## UI preview',
    '',
    `![App shell](${rawScreenshot})`,
    '',
    blobVideo,
    '',
  ].join('\n')
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

export function printPrEmbedInstructions(branch = currentBranch()) {
  const { owner, repo } = parseGitHubRepo()
  const block = buildPrEmbed({ owner, repo, branch })
  console.log('--- Paste into PR description (UI preview) ---\n')
  console.log(block)
  console.log(
    '---\nScreenshot URL must stay on raw.githubusercontent.com (not .github/...).\n',
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
  try {
    printPrEmbedInstructions(parseArgs())
  } catch (err) {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  }
}
