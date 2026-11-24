import { expect, test } from '@playwright/test'

// Výpravy, etapa 3: vedení výpravy s družinou (Při hře): nasazení a odehrání příhody, uzlový bod, tempo, improvizace.

test('družina povede výpravu: příhody, uzlové body, tempo a improvizace přežijí obnovení stránky', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 3000 })
  await page.addInitScript(() => localStorage.setItem('drd2.packPromptDismissed', '1'))

  // družina
  await page.goto('/#/druziny')
  await page.getByLabel('Název nové družiny').fill('Vlci')
  await page.getByRole('button', { name: 'Nová', exact: true }).click()
  await expect(page.getByLabel('Název družiny')).toHaveValue('Vlci')

  // výprava s uzlem a dvěma příhodami
  await page.goto('/#/vypravy')
  await page.getByLabel('Název nové výpravy').fill('Cesta')
  await page.getByRole('button', { name: 'Nová výprava' }).click()
  await page.getByRole('button', { name: 'Přidat uzlový bod' }).click()
  await page.getByLabel('Uzlový bod 1', { exact: true }).fill('Zvrat')
  await page.getByRole('button', { name: 'Přidat příhodu: Na začátku (před prvním uzlovým bodem)' }).click()
  await page.getByLabel('Název příhody').first().fill('Lavina')
  await page.getByRole('button', { name: 'Přidat příhodu: Po uzlovém bodě: Zvrat' }).click()
  await page.getByLabel('Název příhody').nth(1).fill('Zlobři')
  await page.getByLabel('Poznámky', { exact: true }).click() // uložení

  // zahájení vedení z družiny
  await page.goto('/#/druziny')
  await page.getByRole('link', { name: /Vlci/ }).click()
  await page.getByLabel('Výprava k zahájení').selectOption({ label: 'Cesta' })
  await page.getByRole('button', { name: 'Začít', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Při hře' })).toBeVisible()
  await expect(page.getByLabel('Hrajete o Zdroje')).toContainText('Odehráno 0 z 2 příhod')
  await expect(page.getByLabel('Hrajete o Zdroje')).toContainText('Do uzlového bodu „Zvrat“: 1 příhod')

  // nasazení a odehrání první příhody
  const lavina = page.locator('details', { hasText: 'Lavina' })
  await lavina.locator('summary').click()
  await lavina.getByRole('button', { name: 'Nasadit do hry' }).click()
  await expect(lavina.locator('.badge')).toHaveText('ve hře')
  await lavina.getByRole('radio', { name: 'Neúspěch' }).check()
  await lavina.getByLabel('Poznámka k výsledku').fill('Družina ustoupila')
  await lavina.getByRole('button', { name: 'Odehráno' }).click()
  await expect(lavina.locator('.badge')).toHaveText('odehraná · Neúspěch')
  await expect(page.getByLabel('Hrajete o Zdroje')).toContainText('Odehráno 1 z 2 příhod')

  // uzlový bod nastal: příběh je v balíčku po uzlu
  await page.getByRole('button', { name: 'Uzlový bod nastal: Zvrat' }).click()
  await expect(page.getByRole('heading', { name: /Po uzlovém bodě: Zvrat.*právě tady/ })).toBeVisible()

  // improvizace a uložení do přípravy
  await page.getByLabel('Název vymyšlené příhody').fill('Bouře')
  await page.getByRole('button', { name: 'Přidat', exact: true }).click()
  await expect(page.getByRole('heading', { name: /Vymyšleno při hře/ })).toBeVisible()
  const boure = page.locator('details', { hasText: 'Bouře' })
  await boure.locator('summary').click()
  await boure.getByRole('button', { name: 'Uložit do přípravy' }).click()
  await expect(page.getByRole('heading', { name: /Vymyšleno při hře/ })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: /Po uzlovém bodě: Zvrat/ })).toContainText('2')

  // po obnovení stránky je stav zachovaný
  await page.reload()
  await expect(page.locator('details', { hasText: 'Lavina' }).locator('.badge')).toHaveText('odehraná · Neúspěch')
  await expect(page.getByRole('button', { name: 'Vrátit uzlový bod Zvrat' })).toBeVisible()

  // přehled „Co teď vedu“ a vedení z výpravy
  await page.goto('/#/vypravy')
  await expect(page.getByRole('link', { name: /Cesta · Vlci/ })).toContainText('odehráno 1 z 3 příhod')
  await page.getByRole('link', { name: /^Cesta/ }).last().click()
  await expect(page.getByRole('heading', { name: 'Vedení této výpravy' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Cesta · Vlci/ })).toBeVisible()
})
