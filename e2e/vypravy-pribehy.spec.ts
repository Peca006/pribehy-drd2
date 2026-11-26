import { expect, test } from '@playwright/test'
import { readStore } from './helpers.js'

// Výpravy, etapa 2: uzlové body a příhody v balíčcích, přesun mezi balíčky, cizí postavy, uložení.

test('uzlové body a příhody v balíčcích se řadí, přesouvají a přežijí obnovení stránky', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 3000 })
  // pruh o stažení balíčků by zakrýval tlačítka na konci stránky
  await page.addInitScript(() => localStorage.setItem('drd2.packPromptDismissed', '1'))
  await page.goto('/#/vypravy')
  await page.getByLabel('Název nové výpravy').fill('Perlík')
  await page.getByRole('button', { name: 'Nová výprava', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Příprava výpravy' })).toBeVisible()

  // dva uzlové body
  await page.getByRole('button', { name: 'Přidat uzlový bod' }).click()
  await page.getByLabel('Uzlový bod 1', { exact: true }).fill('Věci se komplikují')
  await page.getByRole('button', { name: 'Přidat uzlový bod' }).click()
  await page.getByLabel('Uzlový bod 2', { exact: true }).fill('Rozuzlení')
  await expect(page.getByRole('heading', { name: /Po uzlovém bodě: Věci se komplikují/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Po uzlovém bodě: Rozuzlení/ })).toBeVisible()

  // příhody: dvě na začátku, jedna po prvním uzlu
  const zacatek = 'Přidat příhodu: Na začátku (před prvním uzlovým bodem)'
  await page.getByRole('button', { name: zacatek }).click()
  await page.getByLabel('Název příhody').first().fill('Lavina')
  await page.getByRole('button', { name: zacatek }).click()
  await page.getByLabel('Název příhody').nth(1).fill('Zlobři')
  await page.getByRole('button', { name: 'Přidat příhodu: Po uzlovém bodě: Věci se komplikují' }).click()
  await page.getByLabel('Název příhody').nth(2).fill('Dřevorubci')

  // poslední příhoda se přesune do „Kdykoli“ a dostane cizí postavu
  const dre = page.locator('details', { hasText: 'Dřevorubci' })
  await dre.getByLabel('Balíček').selectOption({ label: 'Kdykoli' })
  const dreAfter = page.locator('details').filter({ has: page.getByLabel('Název příhody') }).last()
  await dreAfter.getByLabel('Jméno cizí postavy').fill('Harald')
  await dreAfter.getByRole('button', { name: 'Přidat', exact: true }).click()
  await expect(dreAfter.locator('.chip', { hasText: 'Harald' })).toBeVisible()

  // pořadí na začátku: Lavina, Zlobři; po posunu Zlobři, Lavina
  const lavina = page.locator('details', { hasText: 'Lavina' }).first()
  await lavina.getByRole('button', { name: /Posunout níže/ }).click()
  const nadpisy = page.locator('details.incident > summary strong')
  await expect(nadpisy).toHaveText(['Zlobři', 'Lavina', 'Dřevorubci'])

  // uložení běží na pozadí: před obnovením stránky počkáme, až je pořadí a cizí postava opravdu v úložišti
  // (jinak se obnovení občas stihne dřív než zápis a test spadne)
  await expect
    .poll(async () => {
      const all = await readStore<{ name: string; incidents: { title: string; cast: { name: string }[] }[] }>(page, 'expeditions')
      const e = all.find((x) => x.name === 'Perlík') // ukázkové výpravy jsou v úložišti taky
      const titles = e?.incidents.map((i) => i.title) ?? []
      const harald = e?.incidents.find((i) => i.title === 'Dřevorubci')?.cast.some((c) => c.name === 'Harald')
      return titles.indexOf('Zlobři') >= 0 && titles.indexOf('Zlobři') < titles.indexOf('Lavina') && !!harald
    })
    .toBe(true)

  // po obnovení stránky je vše zachované
  await page.reload()
  await expect(page.locator('details.incident > summary strong')).toHaveText(['Zlobři', 'Lavina', 'Dřevorubci'])
  await expect(page.getByLabel('Uzlový bod 2', { exact: true })).toHaveValue('Rozuzlení')
  await expect(page.locator('details', { hasText: 'Harald' })).toHaveCount(1)

  // odebrání prvního uzlu: jeho (už žádné) příhody nikam nepropadnou; uzel zmizí z balíčků
  await page.getByRole('button', { name: 'Odebrat uzlový bod 1' }).click()
  await expect(page.getByRole('heading', { name: /Po uzlovém bodě: Věci se komplikují/ })).toHaveCount(0)
  await expect(page.getByLabel('Uzlový bod 1', { exact: true })).toHaveValue('Rozuzlení')
})
