/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { clearRecipes } from './helpers.js'

// Grimoár na liště, předpisy všech druhů, filtr podle druhu a převod starého formátu deníku (lektvary a nástrahy
// zapsané přímo v postavě se při spuštění převedou na předpisy).

test('Grimoár je na liště mezi Bestiářem a Sluj', async ({ page }) => {
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: 'Hlavní navigace' })
  await expect(nav.getByRole('link', { name: /Grimoár/ })).toBeVisible()
  const names = await nav.getByRole('link').allInnerTexts()
  const clean = names.map((n) => n.replace(/\s+/g, ' ').trim())
  const i = clean.findIndex((n) => n.includes('Grimoár'))
  expect(i).toBeGreaterThan(-1)
  expect(clean[i - 1]).toContain('Bestiář')
  expect(clean[i + 1]).toContain('Sluj')
})

test('předpisy všech druhů a filtr podle druhu', async ({ page }) => {
  await page.goto('/#/grimoar')
  await clearRecipes(page)
  await page.getByRole('button', { name: 'Skrýt' }).click()
  const druh = (n: string) => page.getByRole('group', { name: 'Druh nového předpisu' }).getByRole('button', { name: n, exact: true })

  // lektvar: název vzniká z vlastnosti a druhu Jizvy
  await page.getByRole('button', { name: 'Nový…' }).click()
  await druh('Lektvar').click()
  const lektvar = page.getByRole('dialog', { name: 'Lektvar' })
  await lektvar.getByLabel('Název lektvaru').fill('Mast na popáleniny')
  await lektvar.getByLabel('Druh Jizvy').fill('popálenina')
  await lektvar.getByRole('button', { name: 'Uložit do Grimoáru' }).click()
  await expect(page.getByText('Mast na popáleniny (Tělo, popálenina)')).toBeVisible()

  // nástraha
  await page.getByRole('button', { name: 'Nový…' }).click()
  await druh('Nástraha').click()
  const nastraha = page.getByRole('dialog', { name: 'Nástraha' })
  await nastraha.getByLabel('Název nástrahy').fill('Jáma s kůly')
  await nastraha.getByRole('button', { name: 'Uložit do Grimoáru' }).click()
  await expect(page.getByText(/Jáma s kůly \(/)).toBeVisible()

  // výrobek
  await page.getByRole('button', { name: 'Nový…' }).click()
  await druh('Výrobek').click()
  const vyrobek = page.getByRole('dialog', { name: 'Výrobek' })
  await vyrobek.getByRole('button', { name: 'Uložit do Grimoáru' }).click()
  await expect(vyrobek.getByRole('alert')).toContainText('název')
  await vyrobek.getByLabel('Název výrobku').fill('Lano z kopřiv')
  await vyrobek.getByRole('button', { name: 'Uložit do Grimoáru' }).click()
  await expect(page.getByText('Lano z kopřiv')).toBeVisible()

  // filtr podle druhu
  const filtr = page.getByRole('group', { name: 'Filtr podle druhu' })
  await expect(filtr.getByRole('button', { name: /Vše \(3\)/ })).toBeVisible()
  await filtr.getByRole('button', { name: /Lektvar \(1\)/ }).click()
  await expect(page.getByText('Mast na popáleniny (Tělo, popálenina)')).toBeVisible()
  await expect(page.getByText('Lano z kopřiv')).toBeHidden()
  await filtr.getByRole('button', { name: /Kouzlo \(0\)/ }).click()
  await expect(page.getByText('Nic nenalezeno.')).toBeVisible()
})

test('lektvar zapsaný u postavy je předpis v Grimoáru a sdílí se mezi postavami', async ({ page }) => {
  await page.goto('/#/knihovna/dilna')
  await page.getByRole('button', { name: 'Skrýt' }).click()
  await page.getByText('Ukázková data', { exact: true }).click()
  await page.getByRole('button', { name: 'Obnovit', exact: true }).click()
  await page.getByRole('button', { name: 'Obnovit', exact: true }).last().click()
  await expect(page.getByText('Ukázková data jsou obnovená')).toBeVisible()
  await clearRecipes(page)

  await page.goto('/#/postavy')
  await page.getByRole('link', { name: /Brokan Rudovous/ }).click()
  await page.getByRole('button', { name: 'Přidat lektvar' }).click()
  const dlg = page.getByRole('dialog', { name: /Lektvar/ })
  await dlg.getByLabel(/Druh Jizvy/).fill('omrzlina')
  await dlg.getByRole('button', { name: 'Uložit' }).click()
  await expect(page.locator('.potions').getByText('omrzlina (Tělo)')).toBeVisible()

  // v Grimoáru je jeden předpis lektvaru
  await page.goto('/#/grimoar')
  await expect(page.getByText('omrzlina (Tělo)')).toHaveCount(1)

  // stejný lektvar u druhé postavy předpis nezdvojí
  await page.goto('/#/postavy')
  await page.getByRole('link', { name: /Lístek Podhorní/ }).click()
  await page.getByRole('button', { name: 'Přidat lektvar' }).click()
  await dlg.getByLabel(/Druh Jizvy/).fill('omrzlina')
  await dlg.getByRole('button', { name: 'Uložit' }).click()
  await expect(page.locator('.potions').getByText('omrzlina (Tělo)')).toBeVisible()
  await page.goto('/#/grimoar')
  await expect(page.getByText('omrzlina (Tělo)')).toHaveCount(1)
})

test('starý deník s lektvarem a nástrahou se při spuštění převede na předpisy', async ({ page }) => {
  await page.goto('/')
  // databáze vznikla při prvním spuštění; vložíme deník ve starém formátu (jako ho ukládala verze 0.4.1)
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('drd2-data')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const db = open.result
          const tx = db.transaction('characters', 'readwrite')
          const at = '2026-11-01T10:00:00.000Z'
          tx.objectStore('characters').put({
            id: 'stara1',
            schema: 1,
            events: [
              { id: 'e1', at, by: 'P', path: 'name', value: 'Stará hrdinka' },
              { id: 'e2', at, by: 'P', path: 'potions.p1', value: { attribute: 'Duše', scar: 'strach z vody', count: 2, note: 'od Zorky' } },
              {
                id: 'e3',
                at,
                by: 'P',
                path: 'traps.t1',
                value: { name: 'Zvonek na niti', type: 'jednoducha', attribute: 'Vliv', effect: 'ohrozeni', maneuver: '', extra: 0, weakness: 'nit', note: '', count: 3 },
              },
            ],
          })
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
          tx.onerror = () => reject(tx.error)
        }
      }),
  )
  await page.reload()
  await page.getByRole('button', { name: 'Skrýt' }).click()

  await page.goto('/#/postavy/stara1')
  await expect(page.getByRole('heading', { name: 'Stará hrdinka' })).toBeVisible()
  await expect(page.locator('.potions').getByText('strach z vody (Duše)')).toBeVisible()
  await expect(page.locator('.traps').getByText(/Zvonek na niti/)).toBeVisible()

  await page.goto('/#/grimoar')
  await expect(page.getByText('strach z vody (Duše)')).toHaveCount(1)
  await expect(page.getByText(/Zvonek na niti/)).toHaveCount(1)
})

test('výrobky u postavy s počtem kusů a výběr lektvaru z Grimoáru podle názvu', async ({ page }) => {
  await page.goto('/#/grimoar')
  await clearRecipes(page)
  await page.getByRole('button', { name: 'Skrýt' }).click()
  // lektvar v Grimoáru
  await page.getByRole('button', { name: 'Nový…' }).click()
  await page.getByRole('group', { name: 'Druh nového předpisu' }).getByRole('button', { name: 'Lektvar', exact: true }).click()
  await page.getByRole('dialog', { name: 'Lektvar' }).getByLabel('Název lektvaru').fill('Mast na popáleniny')
  await page.getByRole('dialog', { name: 'Lektvar' }).getByLabel('Druh Jizvy').fill('popálenina')
  await page.getByRole('dialog', { name: 'Lektvar' }).getByRole('button', { name: 'Uložit do Grimoáru' }).click()
  await expect(page.getByText('Mast na popáleniny (Tělo, popálenina)')).toBeVisible()

  await page.goto('/#/knihovna/dilna')
  await page.getByText('Ukázková data', { exact: true }).click()
  await page.getByRole('button', { name: 'Obnovit', exact: true }).click()
  await page.getByRole('button', { name: 'Obnovit', exact: true }).last().click()
  await expect(page.getByText('Ukázková data jsou obnovená')).toBeVisible()
  await page.goto('/#/postavy')
  await page.getByRole('link', { name: /Brokan Rudovous/ }).click()

  // výběr lektvaru z Grimoáru: našeptá se bez diakritiky a velikosti písmen, pole se předvyplní
  await page.getByRole('button', { name: 'Přidat lektvar' }).click()
  const dlg = page.getByRole('dialog', { name: 'Lektvar' })
  await dlg.getByLabel('Vybrat z Grimoáru').fill('POPAL')
  await dlg.getByRole('button', { name: 'Mast na popáleniny' }).click()
  await expect(dlg.getByLabel('Druh Jizvy')).toHaveValue('popálenina')
  await dlg.getByRole('button', { name: 'Uložit' }).click()
  await expect(page.locator('.potions').getByText('Mast na popáleniny (Tělo, popálenina)')).toBeVisible()
  // stále jediný předpis lektvaru
  await page.goto('/#/grimoar')
  await expect(page.getByText('Mast na popáleniny (Tělo, popálenina)')).toHaveCount(1)

  // výrobek: nový, počet kusů, odebrání
  await page.goto('/#/postavy')
  await page.getByRole('link', { name: /Brokan Rudovous/ }).click()
  await page.getByRole('button', { name: '+ Nový výrobek…' }).click()
  const v = page.getByRole('dialog', { name: 'Výrobek' })
  await v.getByLabel('Název výrobku').fill('Pochodeň')
  await v.getByRole('button', { name: 'Uložit do Grimoáru' }).click()
  const crafts = page.locator('.crafts')
  await expect(crafts.getByText('Pochodeň')).toBeVisible()
  await crafts.getByRole('button', { name: 'Přidat: Pochodeň' }).click()
  await expect(crafts.locator('.n')).toHaveText('2')
  await crafts.getByRole('button', { name: 'Odebrat: Pochodeň' }).click()
  await expect(crafts.getByText('Pochodeň')).toBeHidden()
  // předpis zůstává v Grimoáru
  await page.goto('/#/grimoar')
  await expect(page.getByText('Pochodeň')).toBeVisible()
})
