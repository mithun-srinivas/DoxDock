import { test, expect } from '@playwright/test'

test.describe('PowerPoint to PDF', () => {
  test('converts a PPTX fully offline', async ({ page }) => {
    test.setTimeout(120000)

    const externalRequests = []

    page.on('request', (req) => {
      const url = new URL(req.url())

      if (url.protocol !== 'blob:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
        externalRequests.push(req.url())
      }
    })

    await page.goto('/#/powerpoint-to-pdf')

    await page.setInputFiles('input[type="file"]', 'e2e/fixtures/doxdock-pptx-simple.pptx')

    await page.getByRole('main').getByRole('button', { name: 'Convert to PDF', exact: true }).click()

    await expect(page.getByRole('main').getByRole('button', { name: /download/i })).toBeVisible({
      timeout: 90000,
    })

    expect(externalRequests).toEqual([])
  })
})
