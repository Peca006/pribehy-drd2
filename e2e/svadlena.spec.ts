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

// Etapa 2: obrázky, role, ikony záložek a ozdoby.
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

test('Švadlena: nahrání obrázku, role, ikona, ozdoba, odmítnutí zlého SVG a odebrání', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('drd2.packPromptDismissed', '1'))
  await page.goto('/#/satnik/svadlena')
  await page.getByLabel('Začít od:').selectOption({ label: 'Tmavý základ (jen barvy)' })
  await page.getByPlaceholder('Můj Háv').fill('Obrázková zkouška')
  await page.getByRole('button', { name: 'Vytvořit a upravit' }).click()
  await expect(page).toHaveURL(/#\/satnik\/svadlena\/moje-obrazkova-zkouska$/)

  // dobrý PNG se přidá, SVG se skriptem a soubor, který není obrázek, se odmítnou
  await page.locator('input[type=file][multiple]').setInputFiles([
    { name: 'Mramor.png', mimeType: 'image/png', buffer: PNG_1X1 },
    { name: 'zly.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>x()</script></svg>') },
    { name: 'text.png', mimeType: 'image/png', buffer: Buffer.from('to není obrázek, jen text') },
  ])
  await expect(page.locator('.assets li')).toHaveCount(1)
  await expect(page.locator('.assets li').first()).toContainText('mramor')
  await expect(page.getByRole('alert').filter({ hasText: 'zly.svg' })).toBeVisible()
  await expect(page.getByRole('alert').filter({ hasText: 'text.png' })).toBeVisible()

  // role pozadí a záhlaví (záhlaví dostane výchozí výšku), ikona záložky a ozdoba
  await page.locator('#r-background').selectOption('mramor')
  await page.locator('#r-header').selectOption('mramor')
  await page.locator('#i-postavy').selectOption('mramor')
  await page.getByRole('button', { name: 'Přidat ozdobu' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Uloženo' })).toBeVisible()
  await expect(page.locator('.assets li').first()).toContainText('role background')

  // náhled dostane obrázek pozadí
  const preview = page.frameLocator('iframe[title^="Náhled aplikace"]')
  await expect
    .poll(() => preview.locator('html').evaluate((el) => getComputedStyle(el).getPropertyValue('--drd-background-image')))
    .toContain('blob:')

  // záhlaví s nesmyslnou výškou se neuloží a vypíše důvod
  await page.getByLabel(/^Výška/).fill('999')
  await page.getByLabel(/^Výška/).press('Tab')
  await expect(page.getByRole('alert').filter({ hasText: 'celé číslo' })).toBeVisible()

  // odebrání použitého obrázku se potvrzuje a odstraní i jeho použití
  await page.getByRole('button', { name: 'Odebrat obrázek mramor' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Odebrat' }).click()
  await expect(page.locator('.assets li')).toHaveCount(0)
  await expect(page.locator('#r-background')).toHaveValue('')
})
