import { expect, test } from '@playwright/test'
import { clearRecipes } from './helpers'

// Kouzla a Grimoár: ad hoc seslání bez uložení, uložení předpisu k postavě, odebrání a přidání našeptáváním
// (bez ohledu na diakritiku a velikost písmen).

test('kouzlo ad hoc, uložení do Grimoáru a přidání našeptáváním', async ({ page }) => {
  // ukázkové postavy
  await page.goto('/#/knihovna')
  await page.getByText('Ukázková data', { exact: true }).click()
  await page.getByRole('button', { name: 'Obnovit', exact: true }).click()
  await page.getByRole('button', { name: 'Obnovit', exact: true }).last().click() // potvrzení
  await expect(page.getByText('Ukázková data jsou obnovená')).toBeVisible()
  await clearRecipes(page)

  await page.goto('/#/postavy')
  await page.getByRole('link', { name: /Brokan Rudovous/ }).click()
  await expect(page.locator('.spells').getByText('Kouzla', { exact: true })).toBeVisible()

  // ad hoc: bez názvu, bez uložení; cena se počítá a záměr se přenese do panelu Hod
  await page.getByRole('button', { name: 'Seslat / nové…' }).click()
  const dlg = page.getByRole('dialog', { name: 'Kouzlo' })
  await dlg.getByLabel('Obor magie').selectOption({ label: 'Vlastní obor…' })
  await dlg.getByLabel('Vlastní obor', { exact: true }).fill('Magie ohně')
  await dlg.getByLabel(/Náročné kouzlo/).check()
  await expect(dlg.getByText('1 Zdroje, 0 Surovin')).toBeVisible()
  await dlg.getByRole('button', { name: 'Seslat', exact: true }).click()
  await expect(dlg).toBeHidden()
  await expect(page.locator('#roll-panel input[type=text]').first()).toHaveValue(/Kouzlo ad hoc: Magie ohně/)
  // nic se neuložilo
  await expect(page.getByLabel('Přidat kouzlo z Grimoáru')).toBeHidden()

  // uložení chce název
  await page.getByRole('button', { name: 'Seslat / nové…' }).click()
  await dlg.getByLabel('Obor magie').selectOption({ label: 'Vlastní obor…' })
  await dlg.getByLabel('Vlastní obor', { exact: true }).fill('Magie ohně')
  await dlg.getByRole('button', { name: 'Uložit do Grimoáru' }).click()
  await expect(dlg.getByRole('alert')).toContainText('zadejte název')
  await dlg.getByLabel('Název kouzla').fill('Ohnivá střela')
  await dlg.getByRole('button', { name: 'Uložit do Grimoáru' }).click()
  await expect(dlg).toBeHidden()
  await expect(page.getByText('Ohnivá střela · Magie ohně')).toBeVisible()

  // odebrat od postavy; v Grimoáru zůstává a našeptá se bez diakritiky i velikosti písmen
  await page.getByRole('button', { name: 'Odebrat: Ohnivá střela' }).click()
  await expect(page.getByText('Ohnivá střela · Magie ohně')).toBeHidden()
  await page.getByLabel('Přidat kouzlo z Grimoáru').fill('OHNIVA')
  await page.getByRole('button', { name: 'Ohnivá střela' }).click()
  // Brokan je bojovník: obor Magie ohně neovládá, přidat jde jen záměrně jako vlastní obor
  await expect(page.getByRole('alert')).toContainText('neovládá')
  await expect(page.getByText('Ohnivá střela · Magie ohně')).toBeHidden()
  await page.getByRole('button', { name: 'Přidat přesto (vlastní obor)' }).click()
  await expect(page.getByText('Ohnivá střela · Magie ohně')).toBeVisible()
  await expect(page.getByText('obor mimo schopnosti')).toBeHidden()
})

test('Grimoár ve Více: nové kouzlo, úprava a smazání s potvrzením', async ({ page }) => {
  await page.goto('/#/grimoar')
  await clearRecipes(page)
  await expect(page.getByText('Grimoár je zatím prázdný')).toBeVisible()

  await page.getByRole('button', { name: 'Nový…' }).click()
  await page.getByRole('group', { name: 'Druh nového předpisu' }).getByRole('button', { name: 'Kouzlo' }).click()
  const dlg = page.getByRole('dialog', { name: 'Kouzlo' })
  await expect(dlg.getByRole('button', { name: 'Seslat', exact: true })).toBeHidden() // bez postavy se nesesílá
  await dlg.getByLabel('Obor magie').selectOption({ label: 'Magie větru' })
  await dlg.getByRole('button', { name: 'Uložit do Grimoáru' }).click()
  await expect(dlg.getByRole('alert')).toContainText('zadejte název')
  await dlg.getByLabel('Název kouzla').fill('Poryv')
  await dlg.getByRole('button', { name: 'Uložit do Grimoáru' }).click()
  await expect(page.getByText('Poryv · Magie větru')).toBeVisible()

  // úprava: stejné kouzlo, nový popis
  await page.getByRole('button', { name: 'Upravit: Poryv' }).click()
  await dlg.getByLabel('Popis kouzla').fill('Nárazový vítr.')
  await dlg.getByRole('button', { name: 'Uložit změny' }).click()
  await expect(page.locator('li', { hasText: 'Poryv' })).toHaveCount(1)

  await page.getByRole('button', { name: 'Smazat: Poryv' }).click()
  await expect(page.getByText('Žádná postava na zařízení předpis nemá')).toBeVisible()
  await page.getByRole('button', { name: 'Smazat', exact: true }).click()
  await expect(page.getByText('Grimoár je zatím prázdný')).toBeVisible()
})

test('sdílení postavy přenese kouzlo do Grimoáru příjemce', async ({ page }) => {
  await page.goto('/#/knihovna')
  await page.getByRole('button', { name: 'Skrýt' }).click() // pruh s nabídkou stažení balíčků by překážel
  await page.getByText('Ukázková data', { exact: true }).click()
  await page.getByRole('button', { name: 'Obnovit', exact: true }).click()
  await page.getByRole('button', { name: 'Obnovit', exact: true }).last().click()
  await expect(page.getByText('Ukázková data jsou obnovená')).toBeVisible()
  await clearRecipes(page)

  // kouzlo uložené u postavy
  await page.goto('/#/postavy')
  await page.getByRole('link', { name: /Brokan Rudovous/ }).click()
  const detail = page.url()
  await page.getByRole('button', { name: 'Seslat / nové…' }).click()
  const dlg = page.getByRole('dialog', { name: 'Kouzlo' })
  await dlg.getByLabel('Název kouzla').fill('Poslední slovo')
  await dlg.getByRole('button', { name: 'Uložit do Grimoáru' }).click()
  await expect(page.locator('.spells').getByText('Poslední slovo')).toBeVisible()

  // kód ke sdílení
  await page.getByRole('link', { name: 'Sdílet…' }).click()
  const code = await page.getByLabel('Kód ke sdílení').inputValue()
  expect(code.length).toBeGreaterThan(50)

  // příjemce nemá ani postavu, ani kouzlo: smazat postavu i kouzlo z Grimoáru
  await page.goto(detail)
  await page.getByText('Další', { exact: true }).click()
  await page.getByRole('button', { name: 'Smazat…' }).click()
  await page.getByRole('button', { name: 'Smazat', exact: true }).click()
  await expect(page).toHaveURL(/#\/postavy$/)
  await page.goto('/#/grimoar')
  await page.getByRole('button', { name: 'Smazat: Poslední slovo' }).click()
  await page.getByRole('button', { name: 'Smazat', exact: true }).click()
  await expect(page.getByText('Grimoár je zatím prázdný')).toBeVisible()

  // import: postava se vrátí a kouzlo je zase v Grimoáru
  await page.goto('/#/postavy/import')
  await page.getByLabel('Kód k importu').fill(code)
  await page.getByRole('button', { name: 'Potvrdit rozhodnutí' }).click()
  await expect(page.getByText(/Předpisy v Grimoáru: přidáno 1/)).toBeVisible()
  await page.goto('/#/grimoar')
  await expect(page.getByText('Poslední slovo')).toBeVisible()
  await page.goto(detail)
  await expect(page.locator('.spells').getByText('Poslední slovo')).toBeVisible()
})

test('Grimoár: sdílení kouzla kódem a import v Postavy → Import', async ({ page }) => {
  await page.goto('/#/grimoar')
  await clearRecipes(page)
  await page.getByRole('button', { name: 'Skrýt' }).click()
  await page.getByRole('button', { name: 'Nový…' }).click()
  await page.getByRole('group', { name: 'Druh nového předpisu' }).getByRole('button', { name: 'Kouzlo' }).click()
  const dlg = page.getByRole('dialog', { name: 'Kouzlo' })
  await dlg.getByLabel('Název kouzla').fill('Vzkaz větru')
  await dlg.getByRole('button', { name: 'Uložit do Grimoáru' }).click()
  await page.getByRole('button', { name: 'Sdílet: Vzkaz větru' }).click()
  const code = await page.getByLabel('Kód předpisů ke sdílení').inputValue()
  expect(code.startsWith('DRD2:')).toBe(true)

  await page.getByRole('button', { name: 'Smazat: Vzkaz větru' }).click()
  await page.getByRole('button', { name: 'Smazat', exact: true }).click()
  await expect(page.getByText('Grimoár je zatím prázdný')).toBeVisible()

  await page.getByRole('link', { name: 'Importovat…' }).click()
  await page.getByLabel('Kód k importu').fill(code)
  await page.getByRole('button', { name: 'Přidat do Grimoáru' }).click()
  await expect(page.getByText('Grimoár: přidáno 1')).toBeVisible()
  await page.goto('/#/grimoar')
  await expect(page.getByText('Vzkaz větru')).toBeVisible()
})
