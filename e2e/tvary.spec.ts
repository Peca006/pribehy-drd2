/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'

// Tvary ploch (M3b): Podzemí má seříznuté rohy panelů, tlačítek a oken, ohnisko tlačítka zůstává viditelné uvnitř;
// jiný Háv bez tvarů zůstává obdélníkový.

const CONFIRM_MODULE = '/src/core/confirm.svelte.ts'
const clip = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((el) => getComputedStyle(el).clipPath)

test('Podzemí ořezává rohy panelů, tlačítek a oken, Pergamen ne', async ({ page }) => {
  await page.goto('/#/postavy')
  await expect(page.locator('.panel').first()).toBeVisible()
  expect(await clip(page, 'button, .btn')).toContain('polygon')
  expect(await clip(page, '.panel')).toContain('polygon')

  // okno
  await page.evaluate(async (m) => {
    const { ask } = await import(/* @vite-ignore */ m)
    void ask('Zkouška okna', { title: 'Zkouška' })
  }, CONFIRM_MODULE)
  await expect(page.locator('dialog[open]')).toBeVisible()
  expect(await clip(page, 'dialog[open]')).toContain('polygon')
  await page.getByRole('button', { name: 'Zrušit' }).click()

  // ohnisko seříznutého tlačítka je uvnitř (vnější by ořez uřízl)
  await page.keyboard.press('Tab')
  const offset = await page.evaluate(() => parseFloat(getComputedStyle(document.activeElement!).outlineOffset))
  expect(offset).toBeLessThan(0)

  // Pergamen tvary nemá
  await page.goto('/#/satnik')
  const card = page.locator('ul.list > li').filter({ has: page.getByText('Pergamen', { exact: true }) })
  await card.getByRole('button', { name: 'Použít' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'pergamen')
  expect(await clip(page, 'button, .btn')).toBe('none')
  expect(await clip(page, '.panel')).toBe('none')
})
