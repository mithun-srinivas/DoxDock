import { test, expect } from '@playwright/test'

test('footer links to the repository for starring', async ({ page }) => {
  await page.goto('/')

  const link = page.getByRole('link', { name: 'Star us on GitHub ★' })
  await expect(link).toBeVisible()
  await expect(link).toHaveAttribute('href', 'https://github.com/mithun-srinivas/DoxDock')
  await expect(link).toHaveAttribute('target', '_blank')
  await expect(link).toHaveAttribute('rel', /(^|\s)noopener(\s|$)/)
  await expect(link).toHaveAttribute('rel', /(^|\s)noreferrer(\s|$)/)
})
