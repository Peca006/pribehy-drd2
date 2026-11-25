import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

// Záloha všech dat do souboru a obnova z něj (Sluj → Dílna → Záloha a obnova dat).

test('záloha se stáhne a jde obnovit (doplnit i přepsat)', async ({ page }) => {
  await page.goto('/#/knihovna/dilna')
  await page.getByText('Ukázková data', { exact: true }).click()
  await page.getByRole('button', { name: 'Obnovit', exact: true }).click()
  await page.getByRole('button', { name: 'Obnovit', exact: true }).last().click() // potvrzení
  await expect(page.getByText('Ukázková data jsou obnovená')).toBeVisible()

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Stáhnout zálohu' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/^drd2-zaloha-\d{4}-\d{2}-\d{2}\.json$/)
  const path = await download.path()
  const backup = JSON.parse(readFileSync(path, 'utf8'))
  expect(backup.format).toBe('drd2-zaloha')
  expect(backup.characters.length).toBeGreaterThanOrEqual(3)
  await expect(page.getByText(/Záloha uložena: \d+ postav/)).toBeVisible()

  // doplnit: vše už v zařízení je, nic se nepřidá
  await page.getByLabel('Obnovit ze zálohy').setInputFiles(path)
  await expect(page.getByText(/\d+ postav, \d+ družin, \d+ bytostí/).last()).toBeVisible()
  await page.getByRole('button', { name: 'Obnovit data' }).click()
  await expect(page.getByText(/Obnoveno: přidáno 0 postav/)).toBeVisible()
  await expect(page.getByText(/ponecháno \d+ stávajících/)).toBeVisible()

  // cizí soubor se srozumitelně odmítne
  await page.getByLabel('Obnovit ze zálohy').setInputFiles({
    name: 'neco.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"format":"jine"}'),
  })
  await expect(page.getByRole('alert').filter({ hasText: 'není záloha' })).toBeVisible()
})
