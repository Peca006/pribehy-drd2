import { expect, test, type Page } from '@playwright/test'

// Švadlena (Dílna → Švadlena): vlastní Háv z vestavěného, úprava tokenů s validací, uložení, použití a export.

const field = (page: Page, label: string) => page.locator('.field').filter({ has: page.getByText(label, { exact: true }) })

test('Švadlena: vytvoření kopie, úprava barvy, odmítnutí špatné hodnoty a nízkého kontrastu, použití a export', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('drd2.packPromptDismissed', '1'))
  await page.goto('/#/knihovna/dilna')
  await page.getByRole('link', { name: 'Švadlena' }).click()
  await expect(page.getByRole('heading', { name: 'Švadlena', level: 1 })).toBeVisible()

  // nový Háv z vestavěného Podzemí
  await page.getByLabel('Začít od:').selectOption({ label: 'Podzemí (vestavěný)' })
  await page.getByPlaceholder('Můj Háv').fill('Moje jeskyně')
  await page.getByRole('button', { name: 'Vytvořit a upravit' }).click()
  await expect(page).toHaveURL(/#\/satnik\/svadlena\/moje-jeskyne$/)
  await expect(page.getByRole('heading', { name: 'Moje jeskyně', level: 2 })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Uloženo' })).toBeVisible()

  // platná barva se uloží a náhled ji převezme
  await field(page, 'Zvýraznění').locator('input:not([type=color])').fill('#33ccff')
  await field(page, 'Zvýraznění').locator('input:not([type=color])').press('Tab')
  await expect(page.getByRole('status').filter({ hasText: 'Uloženo' })).toBeVisible()
  const preview = page.frameLocator('iframe[title^="Náhled aplikace"]')
  await expect
    .poll(() => preview.locator('html').evaluate((el) => getComputedStyle(el).getPropertyValue('--drd-accent')))
    .toBe('#33ccff')

  // nesmysl se odmítne u pole
  await field(page, 'Pozadí stránky').locator('input:not([type=color])').fill('url(x)')
  await field(page, 'Pozadí stránky').locator('input:not([type=color])').press('Tab')
  await expect(field(page, 'Pozadí stránky').getByRole('alert')).toBeVisible()

  // text splývající s pozadím se neuloží a Háv hlásí důvod; po opravě se uloží
  await field(page, 'Text').locator('input:not([type=color])').fill('#202020')
  await field(page, 'Text').locator('input:not([type=color])').press('Tab')
  await expect(page.getByRole('alert').filter({ hasText: 'kontrast' })).toBeVisible()
  await field(page, 'Text').locator('input:not([type=color])').fill('#f3e9d0')
  await field(page, 'Text').locator('input:not([type=color])').press('Tab')
  await expect(page.getByRole('alert').filter({ hasText: 'kontrast' })).toHaveCount(0)

  // použít: aplikace dostane nové zvýraznění
  await page.getByRole('button', { name: 'Použít' }).click()
  await expect(page.getByText('používá se')).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--drd-accent')))
    .toBe('#33ccff')

  // úprava přežije obnovení stránky
  await page.reload()
  await expect(field(page, 'Zvýraznění').locator('input:not([type=color])')).toHaveValue('#33ccff')

  // export do souboru .drdskin
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportovat' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('moje-jeskyne.drdskin')

  // Háv je i v Šatníku s tlačítkem Upravit
  await page.goto('/#/satnik')
  await expect(page.getByRole('link', { name: 'Upravit', exact: true })).toBeVisible()
})
