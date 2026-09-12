import { test, expect } from '@playwright/test'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PDFDocument } from 'pdf-lib'

async function writePdf(path, pageCount) {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pageCount; i++) {
    doc.addPage([200, 200])
  }
  await writeFile(path, await doc.save())
}

test.describe('Alternate PDFs', () => {
  test('interleaves two PDFs fully offline', async ({ page }) => {
    test.setTimeout(120000)

    const externalRequests = []
    page.on('request', (req) => {
      const url = new URL(req.url())
      if (url.protocol !== 'blob:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
        externalRequests.push(req.url())
      }
    })

    const dir = await mkdtemp(join(tmpdir(), 'doxdock-alternate-'))
    const fronts = join(dir, 'fronts.pdf')
    const backs = join(dir, 'backs.pdf')
    await writePdf(fronts, 2)
    await writePdf(backs, 2)

    const main = page.getByRole('main')
    await page.goto('/#/alternate-pdf')
    await page.setInputFiles('input[type="file"]', [fronts, backs])

    await main.getByRole('checkbox', { name: /reverse the second file/i }).check()
    await main.getByRole('button', { name: 'Alternate 2 PDFs', exact: true }).click()

    await expect(main.getByRole('button', { name: /download/i })).toBeVisible({ timeout: 90000 })
    expect(externalRequests).toEqual([])
  })
})
