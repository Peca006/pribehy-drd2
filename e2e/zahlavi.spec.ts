/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'

// Záhlaví a ozdoby Hávu (M3c): Podzemí má záhlaví s názvem aplikace (ne na nízkém viewportu) a rohové ozdoby jen ve volném
// bočním okraji; uživatel může záhlaví skrýt. Háv bez nich (Pergamen) je nemá.

const header = (page: Page) => page.locator('.skin-header')
const ornaments = (page: Page) => page.locator('img.ornament')

test('Podzemí: záhlaví na telefonu na výšku, ne na šířku; ozdoby jen ve volném okraji', async ({
  page,
}) => {
  await page.setViewportSize({ width: 400, height: 700 })
  await page.goto('/#/postavy')
  await expect(header(page)).toBeVisible()
  await expect(header(page)).toContainText('Příběhy v Dračím doupěti')
  expect((await header(page).boundingBox())?.height).toBeGreaterThanOrEqual(40)
  // telefon na výšku nemá volný okraj: žádné ozdoby
  await expect(ornaments(page)).toHaveCount(0)

  // telefon na šířku (nízký viewport): záhlaví se vypne, aby nebralo výšku
  await page.setViewportSize({ width: 740, height: 360 })
  await expect(header(page)).toHaveCount(0)

  // široké okno: ozdoby v rozích mimo sloupec obsahu
  await page.setViewportSize({ width: 1400, height: 800 })
  await expect(header(page)).toBeVisible()
  await expect(ornaments(page)).toHaveCount(4)
  const main = await page.locator('main').boundingBox()
  for (const orn of await ornaments(page).all()) {
    const b = (await orn.boundingBox())!
    const overlaps = b.x < main!.x + main!.width && b.x + b.width > main!.x
    expect(overlaps, 'ozdoba nesmí zasahovat do sloupce obsahu').toBe(false)
  }

  // užší okno, kde se ozdoba do okraje nevejde (sloupec obsahu 704 px + odstupy)
  await page.setViewportSize({ width: 800, height: 800 })
  await expect(ornaments(page)).toHaveCount(0)
})

test('záhlaví jde skrýt v Dílně a Pergamen žádné nemá', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 700 })
  await page.goto('/#/knihovna/dilna')
  await expect(header(page)).toBeVisible()
  await page.getByLabel('Záhlaví vzhledu').selectOption('off')
  await expect(header(page)).toHaveCount(0)
  await page.reload()
  await expect(header(page)).toHaveCount(0)
  await page.getByLabel('Záhlaví vzhledu').selectOption('skin')
  await expect(header(page)).toBeVisible()

  await page.goto('/#/satnik')
  const card = page
    .locator('ul.list > li')
    .filter({ has: page.getByText('Pergamen', { exact: true }) })
  await card.getByRole('button', { name: 'Použít' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'pergamen')
  await expect(header(page)).toHaveCount(0)
  await page.setViewportSize({ width: 1400, height: 800 })
  await expect(ornaments(page)).toHaveCount(0)
})
