import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'

// Zásilky obsahu (PLAN-WEBRTC.md, etapa 1): dobrodružství s výpravou a cizí postavou se pošle souborem
// a „Přijmout obsah“ ho přidá jako novou kopii. Totéž pro vložený balíček bestiáře.

test('dobrodružství: stáhnout soubor, přijmout jako kopii, bestiář z vloženého textu', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 3000 })
  await page.addInitScript(() => localStorage.setItem('drd2.packPromptDismissed', '1'))

  await page.goto('/#/vypravy')
  await page.getByLabel('Název nového dobrodružství').fill('Bílý hrad')
  await page.getByRole('button', { name: 'Nové dobrodružství' }).click()
  await page.getByLabel('Jméno nové cizí postavy').fill('Hubert')
  await page.getByRole('button', { name: 'Přidat cizí postavu' }).click()
  await page.getByLabel('Poznámky k propojení výprav').click()
  await page.getByLabel('Název nové výpravy').fill('Cesta')
  await page.getByRole('button', { name: 'Nová výprava', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Příprava výpravy' })).toBeVisible()
  await page.goBack()

  // odeslání: soubor s kódem
  await page.locator('summary', { hasText: 'Sdílet dobrodružství s výpravami' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Stáhnout soubor' }).first().click(),
  ])
  expect(download.suggestedFilename()).toBe('dobrodruzstvi-bily-hrad.drd2.txt')
  const path = await download.path()
  const code = (await readFile(path, 'utf8')).trim()
  expect(code.startsWith('DRD2:')).toBe(true)

  // příjem: souhrn, nová kopie vedle původního
  await page.goto('/#/prijmout')
  await page.getByLabel('Kód k přijetí').fill(code)
  await expect(page.getByRole('heading', { name: 'Dobrodružství Bílý hrad' })).toBeVisible()
  await expect(page.getByText('Výpravy: 1')).toBeVisible()
  await page.getByRole('button', { name: 'Přidat', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Dobrodružství „Bílý hrad“ je přidané')
  await page.goto('/#/vypravy')
  await expect(page.getByRole('link', { name: /Bílý hrad/ })).toHaveCount(2)

  // bytosti z vloženého balíčku
  await page.goto('/#/prijmout')
  await page
    .getByLabel('Kód k přijetí')
    .fill(JSON.stringify({ format: 1, type: 'bestiar', creatures: [{ name: 'Mlžný vlk' }] }))
  await expect(page.getByRole('heading', { name: 'Bytosti (1)' })).toBeVisible()
  await page.getByRole('button', { name: 'Přidat do bestiáře' }).click()
  await expect(page.getByRole('status')).toContainText('přidáno bytostí: 1')

  // nesmysl se srozumitelně odmítne
  await page.goto('/#/prijmout')
  await page.getByLabel('Kód k přijetí').fill('DRD2:@@@')
  await expect(page.getByRole('alert')).toBeVisible()
})

test('zpráva: napsat, stáhnout jako soubor a přijmout', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('drd2.packPromptDismissed', '1'))
  await page.goto('/#/prijmout')
  await page.getByLabel('Předmět (nepovinný)').fill('Sraz')
  await page.getByLabel('Text zprávy').fill('Sejdeme se u brány.')
  await page.locator('summary', { hasText: 'Odeslat zprávu' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Stáhnout soubor' }).first().click(),
  ])
  expect(download.suggestedFilename()).toBe('zprava-sraz.drd2.txt')
  const code = (await readFile(await download.path(), 'utf8')).trim()

  await page.goto('/#/prijmout')
  await page.getByLabel('Kód k přijetí').fill(code)
  await expect(page.getByRole('heading', { name: 'Zpráva: Sraz' })).toBeVisible()
  await expect(page.locator('.line', { hasText: 'Sejdeme se u brány.' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Přidat', exact: true })).toHaveCount(0)
})
