#!/usr/bin/env node

// Package the built DoxDock app (dist/) into a loadable, unpacked Chrome
// extension (Manifest V3). The whole app, including the local AI model and ONNX
// runtime, is copied into the extension so it runs fully on-device with no
// server. Run `npm run build` first, then `node extension/build-extension.mjs`.

import { existsSync, rmSync, mkdirSync, cpSync, writeFileSync, readFileSync, copyFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const dist = path.join(root, 'dist')
const out = path.join(here, 'build')

if (!existsSync(dist)) {
  console.error('dist/ not found. Run `npm run build` first, then re-run this script.')
  process.exit(1)
}

const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))

// Fresh output folder, then copy the built app in as the extension root.
rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
cpSync(dist, out, { recursive: true })

// Pick whatever PWA icons the build produced (they live at the dist root).
const rootFiles = new Set(readdirSync(out))
const icon = (name, fallback) => (rootFiles.has(name) ? name : fallback)
const icon192 = icon('pwa-192.png', 'favicon.svg')
const icon512 = icon('pwa-512.png', icon192)

const manifest = {
  manifest_version: 3,
  name: 'DoxDock: Private PDF & Image Tools',
  version: pkg.version,
  description:
    'Private PDF and image tools that run 100% on your device. Nothing you open is ever uploaded.',
  icons: { 192: icon192, 512: icon512 },
  action: { default_title: 'Open DoxDock', default_icon: { 192: icon192 } },
  background: { service_worker: 'background.js' },
  // Extension pages need wasm-unsafe-eval for the wasm tools (pdf.js, image
  // compression, on-device AI). MV3 forbids blob: in worker-src, so we omit it
  // and let worker-src fall back to 'self' (same-origin workers only). The app
  // also ships its own strict CSP meta tag which further locks it down.
  content_security_policy: {
    extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
  },
}

writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
copyFileSync(path.join(here, 'background.js'), path.join(out, 'background.js'))

// Clean up things that only make sense on the web, not in an extension:
//   - the PWA service-worker registration (SWs cannot register on a
//     chrome-extension:// page, and the extension is already fully local), and
//   - the `frame-ancestors` CSP directive (ignored in a <meta> tag, only warns).
// Applied to every built HTML page (home + each prerendered tool page).
function walkHtml(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walkHtml(p))
    else if (entry.name.endsWith('.html')) out.push(p)
  }
  return out
}
for (const file of walkHtml(out)) {
  let html = readFileSync(file, 'utf8')
  html = html.replace(/<script id="vite-plugin-pwa:register-sw"[^>]*><\/script>/g, '')
  html = html.replace(/;\s*frame-ancestors 'none'/g, '')
  writeFileSync(file, html)
}
for (const f of readdirSync(out)) {
  if (f === 'registerSW.js' || f === 'sw.js' || /^workbox-.*\.js$/.test(f)) {
    rmSync(path.join(out, f), { force: true })
  }
}

console.log(`✅ Extension packaged at: ${out}`)
console.log(`   version ${pkg.version}, icon ${icon192}`)
console.log('   Load it: chrome://extensions -> enable Developer mode -> Load unpacked -> pick the folder above.')
