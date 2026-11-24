/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'

// Šatník: import souboru `.drdskin`, použití Hávu (přežije načtení stránky), náhled na zařízení, export a smazání.

/** Soubor `.drdskin` vyrobí kód aplikace přímo v stránce (dev server servíruje zdrojáky přes Vite). */
async function skinBytes(
  page: Page,
  id: string,
  name: string,
  tokens: Record<string, string>,
): Promise<Buffer> {
  const bytes = await page.evaluate(
    async ({ id, name, tokens }) => {
      const { validateSkin } = await import(/* @vite-ignore */ '/src/core/skin/skin.ts')
      const { writeSkinFile } = await import(/* @vite-ignore */ '/src/core/skin/file.ts')
      const v = validateSkin({
        schema: 1,
        id,
        name,
        version: '1.0.0',
        author: 'E2E',
        license: 'CC0-1.0',
        scheme: 'dark',
        tokens,
      })
      if (!v.skin) throw new Error(JSON.stringify(v.issues))
      return Array.from(await writeSkinFile(v.skin))
    },
    { id, name, tokens },
  )
  return Buffer.from(bytes)
}

const card = (page: Page, name: string) =>
  page.locator('ul.list > li').filter({ has: page.getByText(name, { exact: true }) })

test('Šatník je dostupný z Více', async ({ page }) => {
  await page.goto('/#/knihovna')
  await page.getByRole('link', { name: /Šatník/ }).click()
  await expect(page.getByRole('heading', { name: 'Šatník', level: 1 })).toBeVisible()
  await expect(card(page, 'Podle systému')).toContainText('používá se')
})

test('import, použití, přežití načtení, náhled, export a smazání Hávu', async ({ page }) => {
  await page.goto('/#/satnik')
  await expect(page.getByRole('heading', { name: 'Šatník', level: 1 })).toBeVisible()

  // import
  const file = await skinBytes(page, 'noc-e2e', 'Noc E2E', {
    '--drd-bg': '#0e1020',
    '--drd-surface': '#1a1d36',
    '--drd-accent': '#7fd1ff',
  })
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'noc-e2e.drdskin', mimeType: 'application/zip', buffer: file })
  await expect(page.getByText('přidán Háv „Noc E2E“')).toBeVisible()
  await expect(card(page, 'Noc E2E')).toBeVisible()

  // použití: změní se vzhled celé aplikace
  await card(page, 'Noc E2E').getByRole('button', { name: 'Použít' }).click()
  const html = page.locator('html')
  await expect(html).toHaveAttribute('data-theme', 'noc-e2e')
  expect(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--drd-accent').trim(),
    ),
  ).toBe('#7fd1ff')
  await expect(card(page, 'Noc E2E')).toContainText('používá se')

  // volba přežije načtení stránky
  await page.reload()
  await expect(html).toHaveAttribute('data-theme', 'noc-e2e')

  // náhled: v rámečku telefonu se ukáže jiný vzhled, než je právě použitý
  await page.getByLabel('Zobrazit vzhled:').selectOption('default-light')
  const preview = page.frameLocator('iframe[title^="Náhled aplikace"]')
  await expect(preview.locator('html')).toHaveAttribute('data-theme', 'default-light')
  await expect(html).toHaveAttribute('data-theme', 'noc-e2e') // aplikace sama se nezměnila
  await page.getByRole('button', { name: 'Tablet na šířku' }).click()
  await expect(page.getByText(/1180 × 820 px · široký, na šířku/)).toBeVisible()

  // export
  const download = page.waitForEvent('download')
  await card(page, 'Noc E2E').getByRole('button', { name: 'Exportovat' }).click()
  expect((await download).suggestedFilename()).toBe('noc-e2e.drdskin')

  // smazání aktivního Hávu: aplikace se vrátí k vzhledu podle systému
  await card(page, 'Noc E2E').getByRole('button', { name: 'Smazat' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Smazat' }).click()
  await expect(card(page, 'Noc E2E')).toHaveCount(0)
  await expect(html).not.toHaveAttribute('data-theme', 'noc-e2e')
  await expect(card(page, 'Podle systému')).toContainText('používá se')
})

test('vadné soubory se nepřidají a ukáže se proč', async ({ page }) => {
  await page.goto('/#/satnik')
  await expect(page.getByRole('heading', { name: 'Šatník', level: 1 })).toBeVisible()
  const input = page.locator('input[type=file]')

  await input.setInputFiles({
    name: 'rozbity.drdskin',
    mimeType: 'application/zip',
    buffer: Buffer.from('tohle není archiv, jen delší text'),
  })
  await expect(page.getByText('to není ZIP archiv')).toBeVisible()

  // text černý na tmavém pozadí: kontrast pod 3:1, Háv se nesmí nainstalovat
  const slepy = await page.evaluate(async () => {
    const { writeZip } = await import(/* @vite-ignore */ '/src/core/skin/zip.ts')
    const manifest = {
      schema: 1,
      id: 'slepy',
      name: 'Slepý',
      version: '1.0.0',
      author: 'E2E',
      license: 'CC0-1.0',
      scheme: 'dark',
      tokens: { '--drd-text': '#1c1a17' },
    }
    return Array.from(
      await writeZip([
        { name: 'manifest.json', data: new TextEncoder().encode(JSON.stringify(manifest)) },
      ]),
    )
  })
  await input.setInputFiles({
    name: 'slepy.drdskin',
    mimeType: 'application/zip',
    buffer: Buffer.from(slepy),
  })
  await expect(page.getByText(/Háv nelze aktivovat/).first()).toBeVisible()
  await expect(card(page, 'Slepý')).toHaveCount(0)
})
