import { expect, test } from '@playwright/test'

// Sluj (rozcestník) a Dílna (nastavení a data): dlaždice, hledání do Příručky, cesta do Dílny a zpět.

test('Sluj nabízí Příručku, Bestiář, Grimoár a Dílnu', async ({ page }) => {
  await page.goto('/#/postavy')
  const nav = page.getByRole('navigation', { name: 'Hlavní navigace' })
  await nav.getByRole('link', { name: /Sluj/ }).click()
  await expect(page.getByRole('heading', { name: 'Sluj', level: 1 })).toBeVisible()
  for (const name of ['Příručka', 'Bestiář', 'Grimoár'])
    await expect(page.locator('.tile').filter({ hasText: name })).toBeVisible()

  // dlaždice vede do sekce
  await page.locator('.tile').filter({ hasText: 'Bestiář' }).click()
  await expect(page).toHaveURL(/#\/bestiar/)

  // bez nainstalovaných knih není co hledat, pole se neukáže
  await page.goto('/#/knihovna')
  await expect(page.getByRole('heading', { name: 'Sluj', level: 1 })).toBeVisible()
  await expect(page.getByRole('search')).toHaveCount(0)

  // Dílna a zpět do Sluje
  await page.goto('/#/knihovna')
  await page.getByRole('link', { name: /Dílna/ }).click()
  await expect(page.getByRole('heading', { name: 'Dílna', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Spodní lišta' })).toBeVisible()
  await page.locator('main').getByRole('link', { name: /Sluj/ }).click()
  await expect(page.getByRole('heading', { name: 'Sluj', level: 1 })).toBeVisible()
})
