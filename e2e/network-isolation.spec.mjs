import { test, expect } from '@playwright/test'

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
