import { test, expect } from '@playwright/test'

test.describe('Protect PDF', () => {
  test('encrypts a PDF fully offline', async ({ page }) => {
    test.setTimeout(120000)

    const externalRequests = []

    page.on('request', (req) => {
      const url = new URL(req.url())

      if (url.protocol !== 'blob:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
        externalRequests.push(req.url())
      }
    })

    const main = page.getByRole('main')

    await page.goto('/#/protect-pdf')

    await page.setInputFiles('input[type="file"]', 'e2e/fixtures/protect-pdf-test.pdf')

    await main.getByLabel('Password', { exact: true }).fill('DoxDockTest123!')

    await main.getByLabel('Confirm password', { exact: true }).fill('DoxDockTest123!')

    await main
      .getByRole('button', {
        name: 'Protect PDF',
        exact: true,
      })
      .click()

    await expect(main.getByRole('button', { name: /download/i })).toBeVisible({
      timeout: 90000,
    })

    await expect(main.getByText(/PDF is encrypted and requires the password/i)).toBeVisible()

    expect(externalRequests).toEqual([])
  })

  test('requires a non-empty matching password', async ({ page }) => {
    const main = page.getByRole('main')

    await page.goto('/#/protect-pdf')

    await page.setInputFiles('input[type="file"]', 'e2e/fixtures/protect-pdf-test.pdf')

    const protectButton = main.getByRole('button', {
      name: 'Protect PDF',
      exact: true,
    })

    await expect(protectButton).toBeDisabled()

    await main.getByLabel('Password', { exact: true }).fill('abc')

    await main.getByLabel('Confirm password', { exact: true }).fill('xyz')

    await expect(protectButton).toBeDisabled()

    await main.getByLabel('Confirm password', { exact: true }).fill('abc')

    await expect(protectButton).toBeEnabled()
  })
})
