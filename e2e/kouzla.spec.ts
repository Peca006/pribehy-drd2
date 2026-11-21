import { expect, test } from '@playwright/test'

// Kouzla a Grimoár: ad hoc seslání bez uložení, uložení předpisu k postavě, odebrání a přidání našeptáváním
// (bez ohledu na diakritiku a velikost písmen).

test('kouzlo ad hoc, uložení do Grimoáru a přidání našeptáváním', async ({ page }) => {
  // ukázkové postavy
  await page.goto('/#/knihovna')
  await page.getByText('Ukázková data', { exact: true }).click()
  await page.getByRole('button', { name: 'Obnovit', exact: true }).click()
  await page.getByRole('button', { name: 'Obnovit', exact: true }).last().click() // potvrzení
  await expect(page.getByText('Ukázková data jsou obnovená')).toBeVisible()

  await page.goto('/#/postavy')
  await page.getByRole('link', { name: /Brokan Rudovous/ }).click()
  await expect(page.getByText('Kouzla', { exact: true })).toBeVisible()

  // ad hoc: bez názvu, bez uložení; cena se počítá a záměr se přenese do panelu Hod
  await page.getByRole('button', { name: 'Seslat / nové…' }).click()
  const dlg = page.getByRole('dialog', { name: 'Kouzlo' })
  await dlg.getByLabel('Obor magie').fill('Magie ohně')
  await dlg.getByLabel(/Náročné kouzlo/).check()
  await expect(dlg.getByText('1 Zdroje, 0 Surovin')).toBeVisible()
  await dlg.getByRole('button', { name: 'Seslat', exact: true }).click()
  await expect(dlg).toBeHidden()
  await expect(page.locator('#roll-panel input[type=text]').first()).toHaveValue(/Kouzlo ad hoc: Magie ohně/)
  // nic se neuložilo
  await expect(page.getByLabel('Přidat kouzlo z Grimoáru')).toBeHidden()

  // uložení chce název
  await page.getByRole('button', { name: 'Seslat / nové…' }).click()
  await dlg.getByLabel('Obor magie').fill('Magie ohně')
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
  await expect(page.getByText('Ohnivá střela · Magie ohně')).toBeVisible()
})
