import { expect, test } from '@playwright/test'

// Výpravy, etapa 4: uzavření výpravy zápisem do žurnálu družiny, další výprava z dobrodružství, bytost do konfliktu.

test('uzavření výpravy uloží zápis do žurnálu a nabídne další výpravu dobrodružství', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 3000 })
  await page.addInitScript(() => localStorage.setItem('drd2.packPromptDismissed', '1'))

  // družina
  await page.goto('/#/druziny')
  await page.getByLabel('Název nové družiny').fill('Vlci')
  await page.getByRole('button', { name: 'Nová', exact: true }).click()
  await expect(page.getByLabel('Název družiny')).toHaveValue('Vlci')

  // dobrodružství se dvěma výpravami
  await page.goto('/#/vypravy')
  await page.getByLabel('Název nového dobrodružství').fill('Bílý hrad')
  await page.getByRole('button', { name: 'Nové dobrodružství' }).click()
  await page.getByLabel('Název nové výpravy').fill('Cesta')
  await page.getByRole('button', { name: 'Nová výprava' }).click()
  await page.getByRole('button', { name: 'Přidat příhodu: Na začátku (před prvním uzlovým bodem)' }).click()
  await page.getByLabel('Název příhody').first().fill('Lavina')
  await page.getByLabel('Cíl výpravy').fill('Dojít k hradu')
  await page.getByLabel('Poznámky', { exact: true }).click() // uložení
  await page.getByRole('link', { name: /Dobrodružství/ }).first().click()
  await page.getByLabel('Název nové výpravy').fill('Hrad')
  await page.getByRole('button', { name: 'Nová výprava' }).click()
  await expect(page.getByRole('heading', { name: 'Příprava výpravy' })).toBeVisible()
  await page.getByLabel('Poznámky', { exact: true }).click() // uložení

  // vedení první výpravy z družiny
  await page.goto('/#/druziny')
  await page.getByRole('link', { name: /Vlci/ }).click()
  await page.getByLabel('Výprava k zahájení').selectOption({ label: 'Cesta' })
  await page.getByRole('button', { name: 'Začít', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Při hře' })).toBeVisible()

  const lavina = page.locator('details', { hasText: 'Lavina' })
  await lavina.locator('summary').click()
  await lavina.getByRole('button', { name: 'Nasadit do hry' }).click()
  await lavina.getByLabel('Poznámka k výsledku').fill('Uhnuli včas')
  await lavina.getByRole('button', { name: 'Odehráno' }).click()

  // návrh zápisu obsahuje odehranou příhodu a jde upravit
  await page.getByRole('button', { name: 'Zapsat do žurnálu a uzavřít' }).click()
  await expect(page.getByLabel('Nadpis zápisu')).toHaveValue('Výprava: Cesta')
  await expect(page.getByLabel('Text zápisu')).toHaveValue(/• Lavina \(úspěch\): Uhnuli včas/)
  await expect(page.getByLabel('Text zápisu')).toHaveValue(/Cíl výpravy: Dojít k hradu/)
  await page.getByRole('button', { name: 'Uložit do žurnálu a uzavřít výpravu' }).click()
  await expect(page.getByText('Zápis je v žurnálu družiny')).toBeVisible()
  await expect(page.getByLabel('Stav vedení')).toHaveValue('hotova')

  // další výprava dobrodružství se nabídne a jde s družinou rovnou začít
  await expect(page.getByRole('heading', { name: 'Další výprava v dobrodružství' })).toBeVisible()
  await page.getByRole('button', { name: /Začít výpravu Hrad s touto družinou/ }).click()
  await expect(page.getByRole('heading', { name: 'Při hře' })).toBeVisible()
  await expect(page.getByLabel('Název', { exact: true })).toHaveValue('Hrad – Vlci')

  // zápis je v žurnálu družiny
  await page.goto('/#/druziny')
  await page.getByRole('link', { name: /Vlci/ }).click()
  await expect(page.getByText('Výprava: Cesta')).toBeVisible()
})
