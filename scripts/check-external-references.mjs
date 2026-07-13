#!/usr/bin/env node

// Static analysis: scan source files for external URL references that would
// violate DoxDock's "zero external network" guarantee. This catches:
//   - CDN links (`cdn.jsdelivr.net`, `unpkg.com`, etc.)
//   - External fonts (`fonts.googleapis.com`)
//   - Analytics pings, API calls, or any absolute URL to a foreign host
//
// Allowed patterns (not flagged):
//   - github.com/mithun-srinivas/DoxDock  (documentation links)
//   - doxdock.vercel.app                   (our own deployment)
//   - Localhost, `self`, or relative URLs
//   - data: and blob: URIs (in-browser generated content)

import { readFileSync } from 'fs'
import { globSync } from 'glob'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const ALLOWED_HOSTS = [
  'github.com/mithun-srinivas/DoxDock',
  'github.com/OSCode-Community',
  'doxdock.vercel.app',
  'opensource.org',
]

// Patterns that look like external URLs in source code.
// Avoid matching relative imports, data:/blob: URIs, and template literals.
const URL_RE =
  /(?:https?:\/\/)([^\s"'`)>\]})]+)/gi

const IGNORE_PATHS = [
  'node_modules/',
  'dist/',
  '.git/',
  'public/',
  'package-lock.json',
  'scripts/check-external-references.mjs',
]

const files = globSync('src/**/*.{js,jsx,html,css}', { cwd: root, ignore: IGNORE_PATHS })

let violations = 0

for (const file of files) {
  const content = readFileSync(path.join(root, file), 'utf-8')
  let match
  URL_RE.lastIndex = 0
  while ((match = URL_RE.exec(content)) !== null) {
    const url = match[0]
    const host = match[1]
    const allowed = ALLOWED_HOSTS.some((a) => host.startsWith(a) || host.endsWith(a))
    if (!allowed) {
      const line = content.slice(0, match.index).split('\n').length
      console.error(`  FAIL  ${file}:${line}  ${url}`)
      violations++
    }
  }
}

if (violations) {
  console.error(`\n❌ ${violations} external URL(s) found. DoxDock must not reference external hosts in source code.`)
  process.exit(1)
} else {
  console.log('✅ No external URL references found in source.')
}
