import { expect, test, type Page } from '@playwright/test'

// Hlavní cesta uživatele: první spuštění → stažení balíčků → tvorba postavy → sdílení kódem → import zpět.
// Spouští se proti vývojovému serveru s balíčky ze SRD z content-packs/srd (viz playwright.config.ts).

const dalsi = (page: Page) => page.getByRole('button', { name: /Dál/ }).click()

/** Klepe na tlačítko, dokud je povolené (rozdělování bodů a úrovní). */
async function pressWhileEnabled(page: Page, name: string, max = 20) {
  const b = page.getByRole('button', { name, exact: true })
  for (let i = 0; i < max && (await b.isEnabled()); i++) await b.click()
}

test('první spuštění, stažení balíčků, postava, sdílení a import', async ({ page }) => {
  await page.goto('/')

  // 1) první spuštění online nabídne stažení pravidel a Bestiáře
  const bar = page.getByRole('status').filter({ hasText: 'Pravidla a Bestiář se dají stáhnout' })
  await expect(bar).toBeVisible()
  await bar.getByRole('button', { name: 'Stáhnout' }).click()
  await expect(bar).toBeHidden()

  // 2) Příručka ukazuje kapitoly a Bestiář bytosti
  await page.getByRole('link', { name: 'Příručka' }).click()
  await expect(page.getByRole('link', { name: 'Rasy' }).first()).toBeVisible()
  await page.getByRole('link', { name: 'Bestiář' }).last().click()
  await expect(page.getByPlaceholder('Hledat bytost…')).toBeVisible()

  // 3) tvorba postavy
  await page.goto('/#/tvorba')
  await expect(page.getByRole('heading', { name: 'Tvorba postavy' })).toBeVisible()
  // balíček je načtený: žádná výzva ke stažení pravidel
  await expect(page.getByText('Používáte vestavěný přehled')).toBeHidden()

  await page.getByLabel('Koncept postavy').fill('Zkouška celé cesty') // Koncept
  await dalsi(page)
  await page.getByRole('radio').first().check() // Rasa
  await page.locator('input[name=kultura]').nth(1).check() // první kultura (z ní plyne doporučená rasová schopnost)
  await dalsi(page)
  await pressWhileEnabled(page, 'Zvýšit úroveň Bojovník') // Povolání
  await dalsi(page)
  await pressWhileEnabled(page, 'Zvýšit Tělo') // Zdatnost
  await dalsi(page)
  await page.getByRole('button', { name: 'Rychlá volba doporučených schopností' }).click() // Schopnosti
  await dalsi(page)
  await page.getByRole('radio').first().check() // Povaha
  await dalsi(page)
  await page.getByRole('button', { name: 'Ceněná', exact: true }).click() // Výbava: hotová sada
  await dalsi(page)
  await page.getByPlaceholder('např. Jarik').fill('Testovací hrdina') // Shrnutí: jméno
  await expect(page.getByText('Ještě chybí')).toBeHidden()
  await page.getByRole('button', { name: 'Vytvořit postavu' }).click()

  // 4) postava je v deníku s popisy z balíčku
  await expect(page.getByRole('heading', { name: 'Testovací hrdina' }).first()).toBeVisible()
  const detail = page.url()
  await expect(page.getByRole('heading', { name: 'Zvláštní schopnosti' })).toBeVisible()
  // popis schopnosti pochází z balíčku (bez balíčku by tu byla jen poznámka „Popis chybí“)
  await expect(page.getByText('Popis chybí')).toBeHidden()

  // 5) sdílení kódem
  await page.getByRole('link', { name: 'Sdílet…' }).click()
  const code = await page.getByLabel('Kód ke sdílení').inputValue()
  expect(code.length).toBeGreaterThan(50)

  // 6) smazání postavy a import téhož kódu zpět
  await page.goto(detail)
  await page.getByText('Další', { exact: true }).click() // sbalený oddíl
  await page.getByRole('button', { name: 'Smazat…' }).click()
  await page.getByRole('button', { name: 'Smazat', exact: true }).click()
  await expect(page.getByText('Testovací hrdina')).toBeHidden()

  await page.getByRole('link', { name: /Import/ }).click()
  await page.getByLabel('Kód k importu').fill(code)
  await page.getByRole('button', { name: 'Potvrdit rozhodnutí' }).click()

  await page.goto('/#/postavy')
  await expect(page.getByText('Testovací hrdina')).toBeVisible()
})
