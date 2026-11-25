import { expect, test } from '@playwright/test'

// Vedení hry, etapa 1: časomíra sezení. Klepnutím se přepíná aktivní hráč, pauza čas zastaví, sezení se uloží a přežije obnovení.

test('časomíra: přepínání hráčů, pauza, obnovení stránky a ukončení', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('drd2.packPromptDismissed', '1'))

  // družina se dvěma členy
  await page.goto('/#/druziny')
  await page.getByLabel('Název nové družiny').fill('Vlci')
  await page.getByRole('button', { name: 'Nová', exact: true }).click()
  await expect(page.getByLabel('Název družiny')).toHaveValue('Vlci')
  await page.getByText('Přidat člena', { exact: true }).click()
  for (const jmeno of ['Aneta', 'Boris']) {
    await page.getByLabel('Jméno člena').fill(jmeno)
    await page.getByLabel('Jméno člena').press('Enter')
    await expect(page.getByText(jmeno, { exact: true }).first()).toBeVisible()
  }

  // stránka Hra
  await page.getByRole('link', { name: /Hra \(časomíra\)/ }).click()
  await expect(page.getByRole('heading', { name: 'Hra: Vlci' })).toBeVisible()
  await page.getByRole('button', { name: 'Začít sezení' }).click()
  const aneta = page.getByRole('button', { name: /Aneta/ })
  const boris = page.getByRole('button', { name: /Boris/ })
  await expect(page.getByRole('status')).toContainText('Časomíra stojí')

  // Aneta je na řadě, pak Boris
  await aneta.click()
  await expect(aneta).toHaveAttribute('aria-pressed', 'true')
  await page.waitForTimeout(2200)
  await boris.click()
  await expect(boris).toHaveAttribute('aria-pressed', 'true')
  await expect(aneta).toHaveAttribute('aria-pressed', 'false')
  await expect(aneta.locator('.t')).not.toHaveText('0:00')
  await expect(aneta.locator('.bar > span')).toHaveAttribute('style', /width: 100%/)

  // pauza zastaví čas Borise
  await page.getByRole('button', { name: 'Pauza' }).click()
  await expect(page.getByRole('button', { name: 'Pokračovat' })).toBeVisible()
  const stojici = await boris.locator('.t').textContent()
  await page.waitForTimeout(1500)
  await expect(boris.locator('.t')).toHaveText(stojici!)

  // sezení přežije obnovení stránky (stav z uložených časových razítek)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Pokračovat' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Aneta/ }).locator('.t')).not.toHaveText('0:00')

  // ukončení uloží souhrn
  await page.getByRole('button', { name: 'Ukončit', exact: true }).click()
  await page.getByRole('button', { name: 'Ukončit', exact: true }).last().click()
  await expect(page.getByRole('heading', { name: 'Poslední sezení' })).toBeVisible()
  await expect(page.getByLabel('Poslední sezení')).toContainText('Aneta')
  await expect(page.getByRole('button', { name: 'Začít sezení' })).toBeVisible()
})
