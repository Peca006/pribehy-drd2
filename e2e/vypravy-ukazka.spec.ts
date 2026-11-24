import { expect, test } from '@playwright/test'

// Výpravy, etapa 6: ukázkové dobrodružství v ukázkových datech a inspirace z postav družiny.

test('ukázkové dobrodružství je v ukázkových datech a inspirace ukáže příběh postav družiny', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 3500 })
  await page.addInitScript(() => localStorage.setItem('drd2.packPromptDismissed', '1'))

  await page.goto('/#/knihovna')
  await page.getByText('Ukázková data', { exact: true }).click()
  await page.getByRole('button', { name: 'Obnovit', exact: true }).click()
  await page.getByRole('button', { name: 'Obnovit', exact: true }).last().click() // potvrzení
  await expect(page.getByText('Ukázková data jsou obnovená')).toBeVisible()

  // dobrodružství se dvěma výpravami
  await page.goto('/#/vypravy')
  const dobrodruzstvi = page.getByRole('link', { name: /Ukázka: Zbloudilý karavan/ })
  await expect(dobrodruzstvi).toContainText('výprav: 2')
  await dobrodruzstvi.click()
  await expect(page.getByRole('link', { name: /Hledání karavanu/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Dluh v Mlžném brodě/ })).toBeVisible()

  // výprava má uzlové body, příhody v balíčcích a kořist
  await page.getByRole('link', { name: /Hledání karavanu/ }).click()
  await expect(page.getByRole('heading', { name: /Po uzlovém bodě: Stopa se láme/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Kdykoli/ })).toBeVisible()
  await expect(page.locator('details > summary strong', { hasText: 'Uhelný milíř' })).toBeVisible()

  // inspirace z postav ukázkové družiny
  await page.locator('details', { hasText: 'Inspirace pro přípravu' }).locator('summary').first().click()
  await page.getByLabel('Družina pro inspiraci').selectOption({ label: 'Ukázková družina' })
  await expect(page.getByText('Roky doprovázel karavany')).toBeVisible()
  await expect(page.getByText('Zeptejte se hráčů')).toBeVisible()

  // ukázková výprava jde smazat i s ostatními ukázkovými daty
  await page.goto('/#/knihovna')
  await page.getByText('Ukázková data', { exact: true }).click()
  await page.getByRole('button', { name: 'Odstranit', exact: true }).click()
  await page.getByRole('button', { name: 'Odstranit', exact: true }).last().click() // potvrzení
  await expect(page.getByText('Ukázková data jsou odstraněná')).toBeVisible()
  await page.goto('/#/vypravy')
  await expect(page.getByRole('link', { name: /Ukázka: Zbloudilý karavan/ })).toHaveCount(0)
})
