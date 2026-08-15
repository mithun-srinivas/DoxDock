import { test, expect } from '@playwright/test'

// The on-device AI tools (remove-background, upscale-image) fetch the ONNX
// runtime wasm and model from same-origin static paths (/ort/, /models/).
// They must never resolve them from a CDN, and the bundler must not emit a
// duplicate wasm into dist/assets (issue #133). These tests prove the runtime
// loads fully offline from /ort/ and that no external request is made.
test.describe('On-device AI tools', () => {
  const trackRequests = (page) => {
    const externalRequests = []
    const localAssetRequests = []
    page.on('request', (req) => {
      const url = new URL(req.url())
      // blob: URLs are in-memory object URLs created by the page itself and
      // never touch the network — always local. Node parses them with an
      // empty hostname, so check the protocol first.
      const isBlob = url.protocol === 'blob:'
      if (!isBlob && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
        externalRequests.push(req.url())
      } else if (!isBlob && (url.pathname.startsWith('/ort/') || url.pathname.startsWith('/models/'))) {
        localAssetRequests.push(url.pathname)
      }
    })
    return { externalRequests, localAssetRequests }
  }

  test('remove-background runs fully offline against /ort/ and /models/', async ({ page }) => {
    test.setTimeout(120000)

    const { externalRequests, localAssetRequests } = trackRequests(page)

    await page.goto('/#/remove-background')
    // The tool page's dropzone label is unique to this route; the sidebar also
    // contains the text "Remove Background", so avoid ambiguous text selectors.
    await page.waitForSelector('text=Drop an image here or click to browse', { timeout: 10000 })

    await page.setInputFiles('input[type="file"]', 'e2e/fixtures/gradient-64.png')
    await page.getByRole('main').getByRole('button', { name: 'Remove Background' }).click()

    // The job runs a wasm inference and renders a result card with a Download button.
    await page.waitForSelector('text=Download', { timeout: 60000 })

    // The ONNX runtime must load the wasm glue + binary from /ort/ and the
    // u2net model from /models/ — all same-origin, no CDN, no external hosts.
    expect(localAssetRequests.some((p) => p.startsWith('/ort/ort-wasm-simd-threaded'))).toBe(true)
    expect(localAssetRequests.some((p) => p.startsWith('/models/'))).toBe(true)
    expect(externalRequests).toEqual([])
  })

  test('upscale-image runs fully offline against /ort/ and /models/', async ({ page }) => {
    test.setTimeout(120000)

    const { externalRequests, localAssetRequests } = trackRequests(page)

    await page.goto('/#/upscale-image')
    await page.waitForSelector('text=Drop images here or click to browse', { timeout: 10000 })

    await page.setInputFiles('input[type="file"]', 'e2e/fixtures/gradient-64.png')
    await page.getByRole('main').getByRole('button', { name: 'Upscale Image' }).click()

    // Upscaling a 64x64 fixture is a single 400px tile — fast enough for CI.
    // The gallery's per-file button carries the accessible title "Download …".
    await page.waitForSelector('text=file ready', { timeout: 60000 })

    // The webgpu/ort runtime must load the jsep glue + binary from /ort/ and
    // the realesr model from /models/ — same-origin, no external hosts.
    expect(localAssetRequests.some((p) => p.startsWith('/ort/ort-wasm-simd-threaded.jsep'))).toBe(true)
    expect(localAssetRequests.some((p) => p.startsWith('/models/'))).toBe(true)
    expect(externalRequests).toEqual([])
  })
})

test.describe('Network isolation', () => {
  test('app loads and makes zero external network requests', async ({ page }) => {
    const requests = []
    page.on('request', (req) => {
      const url = new URL(req.url())
      // Ignore localhost and the preview server origin.
      if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
        requests.push({ url: req.url(), resourceType: req.resourceType() })
      }
    })

    await page.goto('/')
    // Wait for the app shell to render fully.
    await page.waitForSelector('text=DoxDock', { timeout: 10000 })

    // Allow any lazy-loaded chunks to settle.
    await page.waitForTimeout(2000)

    expect(requests).toEqual([])
  })

  test('merge-pdfs tool loads without external requests', async ({ page }) => {
    const requests = []
    page.on('request', (req) => {
      const url = new URL(req.url())
      if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
        requests.push({ url: req.url(), resourceType: req.resourceType() })
      }
    })

    await page.goto('/#/merge-pdfs')
    await page.waitForSelector('text=Merge PDFs', { timeout: 10000 })
    await page.waitForTimeout(2000)

    expect(requests).toEqual([])
  })

  test('compress-image tool loads without external requests', async ({ page }) => {
    const requests = []
    page.on('request', (req) => {
      const url = new URL(req.url())
      if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
        requests.push({ url: req.url(), resourceType: req.resourceType() })
      }
    })

    await page.goto('/#/compress-image')
    await page.waitForSelector('text=Compress Image', { timeout: 10000 })
    await page.waitForTimeout(2000)

    expect(requests).toEqual([])
  })
})
