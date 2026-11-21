/// <reference lib="dom" />
import { expect, test } from '@playwright/test'

// Ilustrace postavy (víc obrázků, jen v zařízení, uložení do souboru) a sdílení postavy od zvolené revize.

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

test('ilustrace postavy: přidání více obrázků, uložení do souboru a odebrání', async ({ page }) => {
  await page.goto('/#/postavy/demo-brokan')
  const sekce = page.getByRole('region', { name: 'Ilustrace postavy' })
  await expect(sekce).toBeVisible()
  await sekce.locator('input[type=file]').setInputFiles([
    { name: 'a.png', mimeType: 'image/png', buffer: PNG },
    { name: 'b.png', mimeType: 'image/png', buffer: PNG },
  ])
  await expect(sekce.getByRole('img')).toHaveCount(2)

  const download = page.waitForEvent('download')
  await sekce.getByRole('button', { name: 'Uložit ilustraci 1 do souboru' }).click()
  expect((await download).suggestedFilename()).toBe('brokan-rudovous-1.webp')

  // po načtení stránky zůstávají
  await page.reload()
  await expect(sekce.getByRole('img')).toHaveCount(2)

  await sekce.getByRole('button', { name: 'Odebrat ilustraci 2' }).click()
  await page.getByRole('button', { name: 'Odebrat', exact: true }).click()
  await expect(sekce.getByRole('img')).toHaveCount(1)
})

test('sdílení postavy: začátek lze zvolit podle revize', async ({ page }) => {
  await page.goto('/#/postavy/demo-brokan/sdilet')
  await expect(page.getByRole('heading', { name: /Sdílet postavu/ })).toBeVisible()
  const od = page.getByRole('radio', { name: /Od zvolené revize/ })
  await od.check()
  await expect(page.getByLabel('Sdílet od revize')).toBeEnabled()
  await expect(page.getByRole('heading', { name: /Obsah \(1\)/ })).toBeVisible()
})
