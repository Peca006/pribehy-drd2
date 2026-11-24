import { expect, test } from '@playwright/test'

// Výpravy, etapa 7: cizí postavy (CP) u dobrodružství, výběr do výpravy, odkaz z příhody a zobrazení při hře.

test('cizí postava dobrodružství: výběr do výpravy, příhoda, vedení a smazání', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 3000 })
  await page.addInitScript(() => localStorage.setItem('drd2.packPromptDismissed', '1'))

  // družina
  await page.goto('/#/druziny')
  await page.getByLabel('Název nové družiny').fill('Vlci')
  await page.getByRole('button', { name: 'Nová', exact: true }).click()
  await expect(page.getByLabel('Název družiny')).toHaveValue('Vlci')

  // dobrodružství s cizí postavou
  await page.goto('/#/vypravy')
  await page.getByLabel('Název nového dobrodružství').fill('Bílý hrad')
  await page.getByRole('button', { name: 'Nové dobrodružství' }).click()
  await expect(page.getByRole('heading', { name: 'Dobrodružství', level: 1 })).toBeVisible()
  await page.getByLabel('Jméno nové cizí postavy').fill('Hubert')
  await page.getByRole('button', { name: 'Přidat cizí postavu' }).click()
  const hubert = page.locator('details', { hasText: 'Hubert' }).first()
  await hubert.locator('summary').click()
  await page.getByLabel('Skupina: Hubert').fill('Celnice')
  await page.getByLabel('Motivace: Hubert').fill('chce pořádek')
  await hubert.getByLabel('Vědomosti').fill('Zná všechny převozy')
  await page.getByLabel('Poznámky k propojení výprav').click() // opuštění pole uloží

  // výprava: výběr cizí postavy z dobrodružství a příhoda s ní
  await page.getByLabel('Název nové výpravy').fill('Cesta')
  await page.getByRole('button', { name: 'Nová výprava', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Příprava výpravy' })).toBeVisible()
  await expect(page.getByLabel('Ve výpravě: Hubert')).not.toBeChecked()
  await page.getByLabel('Ve výpravě: Hubert').check()
  await page.getByRole('button', { name: 'Přidat příhodu: Na začátku (před prvním uzlovým bodem)' }).click()
  await page.getByLabel('Název příhody').first().fill('Rozcestí')
  await page.getByLabel('Přidat cizí postavu z přípravy').selectOption({ label: 'Hubert' })
  await expect(page.locator('.chip', { hasText: 'Hubert' })).toContainText('(CP)')
  await page.getByLabel('Poznámky', { exact: true }).click() // uložení

  // vše přežije obnovení stránky
  await page.reload()
  await expect(page.getByLabel('Ve výpravě: Hubert')).toBeChecked()
  await page.locator('details.incident > summary').first().click()
  await expect(page.locator('.chip', { hasText: 'Hubert' })).toBeVisible()

  // vedení: příhoda ukáže motivaci a vědomosti, přehled skupin je ve zvláštní části
  await page.goto('/#/druziny')
  await page.getByRole('link', { name: /Vlci/ }).click()
  await page.getByLabel('Výprava k zahájení').selectOption({ label: 'Cesta' })
  await page.getByRole('button', { name: 'Začít', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Při hře' })).toBeVisible()
  const rozcesti = page.locator('details', { hasText: 'Rozcestí' })
  await rozcesti.locator('summary').click()
  await expect(rozcesti).toContainText('chce pořádek')
  await expect(rozcesti).toContainText('Zná všechny převozy')
  const prehled = page.locator('details', { hasText: 'Cizí postavy výpravy (1)' })
  await prehled.locator('summary').click()
  await expect(prehled.getByRole('heading', { name: 'Celnice' })).toBeVisible()

  // smazání cizí postavy u dobrodružství odebere výběr, v příhodě zůstane jméno
  await page.goto('/#/vypravy')
  await page.getByRole('link', { name: /Bílý hrad/ }).first().click()
  await page.locator('details', { hasText: 'Hubert' }).first().locator('summary').click()
  await page.getByRole('button', { name: 'Smazat cizí postavu Hubert' }).click()
  await page.getByRole('button', { name: 'Smazat', exact: true }).click()
  await expect(page.getByText('Zatím žádné cizí postavy.')).toBeVisible()
  await page.getByRole('link', { name: /Cesta/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Příprava výpravy' })).toBeVisible()
  await page.locator('details.incident > summary').first().click()
  await expect(page.locator('.chip', { hasText: 'Hubert' })).not.toContainText('(CP)')
  await expect(page.locator('.chip', { hasText: 'Hubert' })).toBeVisible()
})
