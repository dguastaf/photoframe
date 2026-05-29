#!/usr/bin/env node
/**
 * Fail when docs/PR templates use broken ui-preview embed patterns.
 * Uses the same guards as pr-embed.mjs.
 */
import { readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assertNoRelativePreviewImages,
  assertNoRepoVideoLinks,
} from './pr-embed.mjs'

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '../..')

function stripInlineCode(text) {
  return text.replace(/`[^`]*`/g, '')
}

async function listMarkdownFiles(dir, acc = []) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') {
        await listMarkdownFiles(full, acc)
      }
    } else if (/\.(md|mdc)$/.test(entry.name)) {
      acc.push(full)
    }
  }
  return acc
}

async function main() {
  const files = await listMarkdownFiles(ROOT)
  files.sort()
  const errors = []

  for (const full of files) {
    const rel = full.slice(ROOT.length + 1)
    const lines = (await readFile(full, 'utf8')).split(/\r?\n/)
    for (let i = 0; i < lines.length; i++) {
      const line = stripInlineCode(lines[i])
      const label = `./${rel}:${i + 1}`
      try {
        assertNoRelativePreviewImages(line, label)
        assertNoRepoVideoLinks(line, label)
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err))
      }
    }
  }

  if (errors.length) {
    console.error('error: PR ui-preview embeds must use raw.githubusercontent.com GIF links.')
    console.error('')
    for (const err of errors) console.error(`  - ${err}`)
    console.error('')
    console.error('Fix docs to use the template in .github/ui-preview/README.md')
    console.error('Generate a correct block: cd client && npm run ui:embed')
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
