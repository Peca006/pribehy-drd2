/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'

// Poloha lišty (M3a): Háv ji určuje podle viewportu (Podzemí: svislý pruh vlevo na telefonu na šířku a v širokém okně),
// uživatel ji může v Dílně přebít.

const nav = (page: Page) => page.getByRole('navigation', { name: 'Hlavní navigace' })
const position = (page: Page) => page.locator('.shell').getAttribute('data-nav')
const box = async (page: Page) =>
  nav(page).evaluate((el) => {
    const r = el.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })

test('Podzemí: lišta dole na telefonu na výšku, vlevo na šířku a v širokém okně', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 })
  await page.goto('/#/postavy')
  await expect(nav(page)).toBeVisible()
  expect(await position(page)).toBe('bottom')
  const bottom = await box(page)
  expect(bottom.y).toBeGreaterThan(500)
  expect(bottom.w).toBeCloseTo(375, 0)

  // telefon na šířku (nízký viewport): svislý pruh vlevo přes celou výšku
  await page.setViewportSize({ width: 740, height: 360 })
  await expect.poll(() => position(page)).toBe('left')
  const left = await box(page)
  expect(left.x).toBe(0)
  expect(left.h).toBeCloseTo(360, 0)
  expect(left.w).toBeLessThan(120)
  // obsah není pod lištou a stránka se nerozšířila
  const main = await page.locator('main').evaluate((el) => el.getBoundingClientRect().x)
  expect(main).toBeGreaterThanOrEqual(left.w)
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  // záložky jsou pod sebou a Sluj je dostupná
  await nav(page).getByRole('link', { name: /Sluj/ }).click()
  await expect(page.getByRole('heading', { name: 'Sluj', level: 1 })).toBeVisible()

  // široké okno
  await page.setViewportSize({ width: 1200, height: 800 })
  await expect.poll(() => position(page)).toBe('left')
})

test('vlastní poloha lišty přebije Háv a přežije načtení', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 })
  await page.goto('/#/knihovna/dilna')
  await page.getByLabel('Poloha lišty').selectOption('top')
  await expect.poll(() => position(page)).toBe('top')
  expect((await box(page)).y).toBe(0)
  await page.reload()
  await expect.poll(() => position(page)).toBe('top')

  await page.getByLabel('Poloha lišty').selectOption('right')
  await expect.poll(() => position(page)).toBe('right')
  const r = await box(page)
  expect(r.x + r.w).toBeCloseTo(375, 0)

  // návrat k poloze podle Hávu
  await page.getByLabel('Poloha lišty').selectOption('skin')
  await expect.poll(() => position(page)).toBe('bottom')
})

test('Háv bez nastavení polohy má lištu dole i v širokém okně', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 })
  await page.goto('/#/satnik')
  const card = page.locator('ul.list > li').filter({ has: page.getByText('Pergamen', { exact: true }) })
  await card.getByRole('button', { name: 'Použít' }).click()
  await expect.poll(() => position(page)).toBe('bottom')
})
