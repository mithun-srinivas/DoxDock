import { test, expect } from '@playwright/test'

test.describe('Image OCR', () => {
  test('recognizes text fully offline using local Tesseract assets', async ({ page }) => {
    test.setTimeout(120000)

    const externalRequests = []

    page.on('request', (req) => {
      const url = new URL(req.url())

      if (url.protocol !== 'blob:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
        externalRequests.push(req.url())
      }
    })

    await page.goto('/#/image-ocr')

    await page.setInputFiles(
      'input[type="file"]',
      'e2e/fixtures/ocr-test.png',
    )

    await page.getByRole('main').getByRole('button', { name: 'Extract text', exact: true }).click()

    const textarea = page.getByRole('textbox', {
      name: 'Recognized text from ocr-test.png',
    })

    await expect(textarea).toHaveValue(/DoxDock OCR Test/i, {
      timeout: 90000,
    })

    expect(externalRequests).toEqual([])
  })
})
