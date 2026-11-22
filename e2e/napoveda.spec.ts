import { expect, test } from '@playwright/test'

// Nápověda „?“ u pomůcek: panel pod prvkem, přepínání, odkaz do SRD bez balíčku, nápověda v dialogu.

test('nápověda u přehledu postavy a v dialogu', async ({ page }) => {
  await page.goto('/#/knihovna')
  await page.getByText('Ukázková data', { exact: true }).click()
  await page.getByRole('button', { name: 'Obnovit', exact: true }).click()
  await page.getByRole('button', { name: 'Obnovit', exact: true }).last().click() // potvrzení
  await expect(page.getByText('Ukázková data jsou obnovená')).toBeVisible()

  await page.goto('/#/postavy')
  await page.getByRole('link', { name: /Brokan Rudovous/ }).click()

  // Zdroje: panel se otevře a zavře, odkaz míří do SRD (balíček v testu není)
  const zdroje = page.getByRole('button', { name: 'Nápověda: Zdroje' })
  await expect(zdroje).toHaveAttribute('aria-expanded', 'false')
  await zdroje.click()
  const panel = page.getByRole('region', { name: 'Nápověda: Zdroje' })
  await expect(panel).toContainText('Tělo, Duše a Vliv')
  await expect(panel.getByRole('link', { name: 'V SRD →' })).toHaveAttribute(
    'href',
    /zakladni-prirucka\/31-zakladni-pravidla\.html#zdroje/,
  )
  await zdroje.click()
  await expect(panel).toBeHidden()

  // Hotovost, Suroviny a Hod mají každé svůj panel
  for (const [tlacitko, text] of [
    ['Nápověda: Hotovost', 'Dukáty, groše a haléře'],
    ['Nápověda: Suroviny', 'Druhá „měna“'],
    ['Nápověda: Hod', 'Hod 2k6'],
  ] as const) {
    await page.getByRole('button', { name: tlacitko }).click()
    await expect(page.getByRole('region', { name: tlacitko })).toContainText(text)
  }

  // dialog Kouzlo: vlastní „?“ s nápovědou ke kouzlům
  await page.getByRole('button', { name: 'Seslat / nové…' }).click()
  const dlg = page.getByRole('dialog', { name: 'Kouzlo' })
  await dlg.getByRole('button', { name: 'Nápověda: Kouzlo' }).click()
  await expect(dlg.getByRole('region', { name: 'Nápověda: Kouzla' })).toContainText('rituálu')
})

test('nápověda u importu a žurnálu družiny', async ({ page }) => {
  await page.goto('/#/knihovna')
  await page.getByText('Ukázková data', { exact: true }).click()
  await page.getByRole('button', { name: 'Obnovit', exact: true }).click()
  await page.getByRole('button', { name: 'Obnovit', exact: true }).last().click() // potvrzení
  await expect(page.getByText('Ukázková data jsou obnovená')).toBeVisible()

  await page.goto('/#/postavy/import')
  await page.getByRole('button', { name: 'Nápověda: Import' }).click()
  await expect(page.getByRole('region', { name: 'Nápověda: Import' })).toContainText('Ponechat moje')

  await page.goto('/#/druziny')
  await page.locator('a.btn.panel, .panel a').first().click()
  await page.getByRole('button', { name: 'Nápověda: Žurnál dobrodružství' }).click()
  await expect(page.getByRole('region', { name: 'Nápověda: Žurnál družiny' })).toContainText('Průvodce')
})
