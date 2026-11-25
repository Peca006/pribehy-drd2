/// <reference lib="dom" />
import { expect, test } from '@playwright/test'

// Spodní lišta: na úzkém telefonu se střed posouvá, jedna záložka je přišpendlená vlevo a jedna vpravo,
// pořadí, skrytí a přišpendlení se nastavují v Dílně a přežijí načtení stránky.

test.use({ viewport: { width: 360, height: 700 } })

test('lišta se na telefonu posouvá a jde nastavit', async ({ page }) => {
  await page.goto('/#/postavy')
  const nav = page.getByRole('navigation', { name: 'Hlavní navigace' })
  await expect(nav).toBeVisible()

  // výchozí: Postava vlevo, Sluj vpravo, mezi nimi posuvný střed bez vodorovného posunu celé stránky
  const links = nav.getByRole('link')
  await expect(links.first()).toContainText('Postava')
  await expect(links.last()).toContainText('Sluj')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  expect(overflow).toBe(false)
  const scroller = page.locator('.scroller')
  const scrollable = await scroller.evaluate((el) => el.scrollWidth > el.clientWidth)
  expect(scrollable).toBe(true)

  // posun doprava odkryje poslední záložku a přišpendlené zůstávají vidět
  await scroller.evaluate((el) => (el.scrollLeft = el.scrollWidth))
  await expect(nav.getByRole('link', { name: /Grimoár/ })).toBeInViewport()
  await expect(links.first()).toBeInViewport()
  await expect(links.last()).toBeInViewport()

  // otevření záložky ze střední části ji dorolovala do viditelné části
  await scroller.evaluate((el) => (el.scrollLeft = 0))
  await nav.getByRole('link', { name: /Bestiář/ }).click({ force: true })
  await expect(page).toHaveURL(/#\/bestiar/)
  await expect(nav.getByRole('link', { name: /Bestiář/ })).toBeInViewport()

  // nastavení: Grimoár přišpendlit vlevo (Postava přejde do posuvné části), Bestiář skrýt
  await nav.getByRole('link', { name: /Sluj/ }).click()
  await page.getByRole('link', { name: /Dílna/ }).click()
  await page.getByLabel('Umístění: Grimoár').selectOption('left')
  await page.getByLabel('Umístění: Bestiář').selectOption('hidden')
  await expect(links.first()).toContainText('Grimoár')
  await expect(nav.getByRole('link', { name: /Bestiář/ })).toHaveCount(0)
  await expect(page.getByLabel('Umístění: Postava')).toHaveValue('scroll')

  // Sluj nejde skrýt
  await expect(page.getByLabel('Umístění: Sluj').locator('option[value="hidden"]')).toBeDisabled()

  // pořadí: Příručka o místo výš
  const before = await nav.getByRole('link').allTextContents()
  await page.getByRole('button', { name: 'Posunout výš: Příručka' }).click()
  const after = await nav.getByRole('link').allTextContents()
  expect(after).not.toEqual(before)

  // přežije načtení stránky
  await page.reload()
  await expect(nav.getByRole('link').first()).toContainText('Grimoár')
  await expect(nav.getByRole('link', { name: /Bestiář/ })).toHaveCount(0)

  // vrácení výchozího
  await nav.getByRole('link', { name: /Sluj/ }).click()
  await page.getByRole('link', { name: /Dílna/ }).click()
  await page.getByRole('button', { name: 'Vrátit výchozí' }).click()
  await expect(nav.getByRole('link').first()).toContainText('Postava')
  await expect(nav.getByRole('link', { name: /Bestiář/ })).toHaveCount(1)
})
