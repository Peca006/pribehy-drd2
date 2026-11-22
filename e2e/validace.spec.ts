import { expect, test } from '@playwright/test'

// Průběžná kontrola postavy: nedostupná pokročilá povolání jsou vidět, ale nejdou přidat; tvorba upozorní hned.

async function ukazkovaData(page: import('@playwright/test').Page) {
  await page.goto('/#/knihovna')
  await page.getByText('Ukázková data', { exact: true }).click()
  await page.getByRole('button', { name: 'Obnovit', exact: true }).click()
  await page.getByRole('button', { name: 'Obnovit', exact: true }).last().click() // potvrzení
  await expect(page.getByText('Ukázková data jsou obnovená')).toBeVisible()
}

test('úprava: povolání bez splněných podmínek je zašedlé s důvodem', async ({ page }) => {
  await ukazkovaData(page)
  await page.goto('/#/postavy')
  await page.getByRole('link', { name: /Brokan Rudovous/ }).click()
  await page.locator('a[href$="/uprav"]').click()

  const select = page.getByRole('combobox', { name: 'Přidat povolání' })
  await expect(select.locator('option[disabled]').first()).toContainText('zatím nelze')
  await expect(select.locator('option:not([disabled])')).not.toHaveCount(0)
})

test('tvorba: po přeskočení kroku se nahoře ukáže, co nesedí', async ({ page }) => {
  await ukazkovaData(page)
  await page.goto('/#/tvorba/schopnosti')
  await expect(page.getByText('V předchozích krocích ještě něco nesedí')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Vyberte rasu.' })).toBeVisible()
})
