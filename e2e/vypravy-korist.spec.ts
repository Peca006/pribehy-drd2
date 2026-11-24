import { expect, test } from '@playwright/test'

// Výpravy, etapa 5: kořist u příhody, odhalení, upřesnění a rozdělení členu družiny (zapíše se jeho postavě).

test('kořist se odhalí, upřesní a rozdělí; postava ji má v deníku a družina v návrhu zápisu', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 3500 })
  await page.addInitScript(() => localStorage.setItem('drd2.packPromptDismissed', '1'))

  // ukázková družina s postavami na tomto zařízení
  await page.goto('/#/knihovna')
  await page.getByText('Ukázková data', { exact: true }).click()
  await page.getByRole('button', { name: 'Obnovit', exact: true }).click()
  await page.getByRole('button', { name: 'Obnovit', exact: true }).last().click() // potvrzení
  await expect(page.getByText('Ukázková data jsou obnovená')).toBeVisible()

  // výprava s kořistí u příhody
  await page.goto('/#/vypravy')
  await page.getByLabel('Název nové výpravy').fill('Cesta')
  await page.getByRole('button', { name: 'Nová výprava', exact: true }).click()
  await page.getByRole('button', { name: 'Přidat příhodu: Na začátku (před prvním uzlovým bodem)' }).click()
  await page.getByLabel('Název příhody').first().fill('Zlobři')
  await page.getByRole('button', { name: /Přidat kořist k příhodě/ }).click()
  await page.getByLabel('Množství kořisti').fill('5')
  await page.getByRole('button', { name: /Přidat kořist k příhodě/ }).click()
  await page.getByLabel('Druh kořisti').nth(1).selectOption('vybava')
  await page.getByLabel('Popis kořisti').nth(1).fill('Runové kladivo')
  await page.getByLabel('Poznámky', { exact: true }).click() // uložení

  // vedení s ukázkovou družinou
  await page.goto('/#/druziny')
  await page.getByRole('link', { name: /Ukázková družina/ }).click()
  await page.getByLabel('Výprava k zahájení').selectOption({ label: 'Cesta' })
  await page.getByRole('button', { name: 'Začít', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Kořist' })).toBeVisible()
  await expect(page.getByText('Skrytá kořist')).toHaveCount(2)

  // odhalit, upřesnit (8 grošů) a rozdělit Brokanovi
  await page.getByRole('button', { name: 'Odhalit kořist z příhody Zlobři' }).first().click()
  await page.getByLabel('Množství', { exact: true }).fill('8')
  await page.getByLabel('Množství', { exact: true }).blur()
  await expect(page.getByText('8 grošů').first()).toBeVisible()
  await page.getByLabel(/Komu připadne: 8 grošů/).selectOption({ label: 'Brokan Rudovous' })
  await page.getByRole('button', { name: 'Rozdělit' }).click()
  await expect(page.getByText('Kořist je zapsaná postavě')).toBeVisible()
  await expect(page.getByText(/Rozděleno: Brokan Rudovous/)).toBeVisible()

  // druhá položka (výbava) se rozdělí také a pak je kořist v návrhu zápisu do žurnálu
  await page.getByRole('button', { name: 'Odhalit kořist z příhody Zlobři' }).click()
  await page.getByLabel(/Komu připadne: Runové kladivo/).selectOption({ label: 'Brokan Rudovous' })
  await page.getByRole('button', { name: 'Rozdělit' }).click()
  await expect(page.getByText(/Rozděleno: Brokan Rudovous/)).toHaveCount(2)
  await page.getByRole('button', { name: 'Zapsat do žurnálu a uzavřít' }).click()
  await expect(page.getByLabel('Text zápisu')).toHaveValue(/Kořist:\n• 8 grošů → Brokan Rudovous\n• Runové kladivo → Brokan Rudovous/)

  // postava má kořist v deníku
  await page.goto('/#/postavy')
  await page.getByRole('link', { name: /Brokan Rudovous/ }).click()
  await expect(page.getByText('Runové kladivo').first()).toBeVisible()
})
