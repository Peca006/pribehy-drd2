/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'

// Šatník: import souboru `.drdskin`, použití Hávu (přežije načtení stránky), náhled na zařízení, export a smazání.

// Soubory `.drdskin` vyrábí kód aplikace přímo ve stránce (dev server servíruje zdrojáky přes Vite). Adresy modulů jsou
// v proměnných, aby je TypeScript při kontrole typů nezkoušel hledat na disku (existují jen v prohlížeči).
const SKIN_MODULE = '/src/core/skin/skin.ts'
const FILE_MODULE = '/src/core/skin/file.ts'
const ZIP_MODULE = '/src/core/skin/zip.ts'
const CONFIRM_MODULE = '/src/core/confirm.svelte.ts'

/** Otevře potvrzovací dialog aplikace (stejný, jaký ukazuje např. mazání) a vrátí jeho vypočtený styl. */
async function openDialog(page: Page) {
  await page.evaluate(async (m) => {
    const { ask } = await import(/* @vite-ignore */ m)
    void ask('Zkouška okna', { title: 'Zkouška' })
  }, CONFIRM_MODULE)
  const dialog = page.locator('dialog[open]')
  await expect(dialog).toBeVisible()
  const style = () =>
    dialog.evaluate((el) => {
      const s = getComputedStyle(el)
      return { width: s.borderTopWidth, style: s.borderTopStyle, image: s.borderImageSource }
    })
  const close = async () => {
    await page.getByRole('button', { name: 'Zrušit' }).click()
    await expect(dialog).toHaveCount(0)
  }
  return { style, close }
}

async function skinBytes(
  page: Page,
  id: string,
  name: string,
  tokens: Record<string, string>,
): Promise<Buffer> {
  const bytes = await page.evaluate(
    async ({ id, name, tokens, SKIN_MODULE, FILE_MODULE }): Promise<number[]> => {
      const { validateSkin } = await import(/* @vite-ignore */ SKIN_MODULE)
      const { writeSkinFile } = await import(/* @vite-ignore */ FILE_MODULE)
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
    { id, name, tokens, SKIN_MODULE, FILE_MODULE },
  )
  return Buffer.from(bytes)
}

/** Archiv `.drdskin` s libovolným manifestem a textovými soubory (např. SVG), vyrobený zapisovačem ZIPu z aplikace. */
async function archiveBytes(
  page: Page,
  manifest: Record<string, unknown>,
  files: Record<string, string>,
): Promise<Buffer> {
  const bytes = await page.evaluate(
    async ({ manifest, files, ZIP_MODULE }): Promise<number[]> => {
      const { writeZip } = await import(/* @vite-ignore */ ZIP_MODULE)
      const enc = new TextEncoder()
      const entries = [
        { name: 'manifest.json', data: enc.encode(JSON.stringify(manifest)) },
        ...Object.entries(files).map(([name, text]) => ({ name, data: enc.encode(text) })),
      ]
      return Array.from(await writeZip(entries))
    },
    { manifest, files, ZIP_MODULE },
  )
  return Buffer.from(bytes)
}

const SVG_OK =
  '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#345"/></svg>'

const baseManifest = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  schema: 1,
  id,
  name,
  version: '1.0.0',
  author: 'E2E',
  license: 'CC0-1.0',
  scheme: 'dark',
  ...extra,
})

const card = (page: Page, name: string) =>
  page.locator('ul.list > li').filter({ has: page.getByText(name, { exact: true }) })

test('Šatník je dostupný z Více', async ({ page }) => {
  await page.goto('/#/knihovna')
  await page.getByRole('link', { name: /Šatník/ }).click()
  await expect(page.getByRole('heading', { name: 'Šatník', level: 1 })).toBeVisible()
  // výchozí vzhled je Háv Podzemí; vlastní volba (i „Podle systému“) se pak respektuje
  await expect(card(page, 'Podzemí')).toContainText('používá se')
  await card(page, 'Podle systému').getByRole('button', { name: 'Použít' }).click()
  await expect(card(page, 'Podle systému')).toContainText('používá se')
  await page.reload()
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
  const slepy = await page.evaluate(async (ZIP_MODULE): Promise<number[]> => {
    const { writeZip } = await import(/* @vite-ignore */ ZIP_MODULE)
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
  }, ZIP_MODULE)
  await input.setInputFiles({
    name: 'slepy.drdskin',
    mimeType: 'application/zip',
    buffer: Buffer.from(slepy),
  })
  await expect(page.getByText(/Háv nelze aktivovat/).first()).toBeVisible()
  await expect(card(page, 'Slepý')).toHaveCount(0)
})

test('vestavěné Hávy: Podzemí se použije bez instalace, přežije načtení a jde exportovat jako vzor', async ({
  page,
}) => {
  await page.goto('/#/satnik')
  await expect(page.getByRole('heading', { name: 'Šatník', level: 1 })).toBeVisible()
  for (const name of ['Pergamen', 'Noc', 'Podzemí'])
    await expect(card(page, name)).toContainText('vestavěný')

  // Podzemí je výchozí; nejdřív přepnout jinam, ať se použití vyzkouší
  await card(page, 'Noc').getByRole('button', { name: 'Použít' }).click()
  await card(page, 'Podzemí').getByRole('button', { name: 'Použít' }).click()
  const html = page.locator('html')
  await expect(html).toHaveAttribute('data-theme', 'podzemi')
  const css = (v: string) =>
    page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), v)
  expect(await css('--drd-radius')).toBe('0px')
  expect(await css('--drd-accent')).toBe('#f2c14e')
  // grafika Podzemí: pozadí a rámečky z obrázků, ikony záložek, embos textu
  const nav = page.getByRole('navigation', { name: 'Hlavní navigace' })
  await expect(nav.locator('img.icon-img')).toHaveCount(7)
  expect(await css('--drd-background-image')).toMatch(/^url\("blob:/)
  expect(await css('--drd-panel-bi-source')).toMatch(/^url\("blob:/)
  expect(
    await page.evaluate(() => getComputedStyle(document.body, '::before').backgroundImage),
  ).toContain('blob:')
  expect(await page.evaluate(() => getComputedStyle(document.body).textShadow)).not.toBe('none')
  await page.reload()
  await expect(html).toHaveAttribute('data-theme', 'podzemi')
  await expect(nav.locator('img.icon-img')).toHaveCount(7) // obrázky jsou hned po načtení

  // rámy mají skutečnou šířku a styl okraje (ne jen obrázek přes nulový okraj): panel, tlačítko i dialog
  const border = (selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((el) => {
        const s = getComputedStyle(el)
        return { width: parseFloat(s.borderTopWidth), style: s.borderTopStyle }
      })
  expect(await border('.panel')).toMatchObject({ style: 'solid' })
  expect((await border('.panel')).width).toBeGreaterThan(4)
  expect((await border('button')).width).toBeGreaterThan(2)
  const frame = await openDialog(page)
  const framed = await frame.style()
  expect(framed.style).toBe('solid')
  expect(parseFloat(framed.width)).toBeGreaterThan(8)
  expect(framed.image).toMatch(/^url\("blob:/)
  await frame.close()

  // vestavěný Háv nejde smazat, ale jde z něj uložit vzor
  await expect(card(page, 'Podzemí').getByRole('button', { name: 'Smazat' })).toHaveCount(0)
  const download = page.waitForEvent('download')
  await card(page, 'Podzemí').getByRole('button', { name: 'Exportovat jako vzor' }).click()
  expect((await download).suggestedFilename()).toBe('podzemi.drdskin')

  // Pergamen je světlý
  await card(page, 'Pergamen').getByRole('button', { name: 'Použít' }).click()
  await expect(html).toHaveAttribute('data-theme', 'pergamen')
  expect(await css('--drd-bg')).toBe('#efe3c8')
  // po přepnutí nezůstane nic z grafiky Podzemí
  await expect(nav.locator('img.icon-img')).toHaveCount(0)
  expect(await css('--drd-background-image')).toBe('')
  expect(await css('--drd-panel-bi-source')).toBe('')
  expect(await page.evaluate(() => getComputedStyle(document.body).textShadow)).toBe('none')
  // dialog bez Hávu s obrázky má obyčejný okraj 1 px bez rámu
  const plain = await openDialog(page)
  expect(await plain.style()).toEqual({ width: '1px', style: 'solid', image: 'none' })
  await plain.close()
})

test('Háv s obrázky: import, použití (pozadí, rámeček, ikona), reload a odebrání při přepnutí', async ({
  page,
}) => {
  await page.goto('/#/satnik')
  await expect(page.getByRole('heading', { name: 'Šatník', level: 1 })).toBeVisible()

  const file = await archiveBytes(
    page,
    baseManifest('obrazky-e2e', 'Obrázkový E2E', {
      assets: { dlazdice: { file: 'assets/dlazdice.svg' }, ram: { file: 'assets/ram.svg' } },
      roles: {
        background: { image: 'dlazdice', mode: 'repeat', size: 32 },
        panel: { image: 'ram', mode: 'slice', slice: 2, fill: false },
      },
      icons: { postavy: 'dlazdice' },
    }),
    { 'assets/dlazdice.svg': SVG_OK, 'assets/ram.svg': SVG_OK },
  )
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'obrazky-e2e.drdskin', mimeType: 'application/zip', buffer: file })
  await expect(page.getByText('přidán Háv „Obrázkový E2E“')).toBeVisible()
  await expect(card(page, 'Obrázkový E2E')).toContainText('2 obrázky')

  await card(page, 'Obrázkový E2E').getByRole('button', { name: 'Použít' }).click()
  const html = page.locator('html')
  await expect(html).toHaveAttribute('data-theme', 'obrazky-e2e')
  const css = (v: string) =>
    page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), v)
  const nav = page.getByRole('navigation', { name: 'Hlavní navigace' })
  await expect(nav.locator('img.icon-img')).toHaveCount(1) // jen záložka Postava má ikonu, ostatní zůstávají s emoji
  expect(await css('--drd-background-image')).toMatch(/^url\("blob:/)
  expect(await css('--drd-panel-bw')).toBe('2px 2px 2px 2px')
  expect(
    await page.evaluate(() => getComputedStyle(document.body, '::before').backgroundSize),
  ).toBe('32px auto')

  // obrázky jsou uložené v zařízení: po načtení stránky jsou hned
  await page.reload()
  await expect(html).toHaveAttribute('data-theme', 'obrazky-e2e')
  await expect(nav.locator('img.icon-img')).toHaveCount(1)
  expect(await css('--drd-background-image')).toMatch(/^url\("blob:/)

  // přepnutí na vestavěný Háv obrázky odebere
  await card(page, 'Tmavý').getByRole('button', { name: 'Použít' }).click()
  await expect(html).toHaveAttribute('data-theme', 'default-dark')
  await expect(nav.locator('img.icon-img')).toHaveCount(0)
  expect(await css('--drd-background-image')).toBe('')
  expect(await css('--drd-panel-bw')).toBe('')
})

test('Háv se škodlivým nebo chybným obrázkem se nepřidá', async ({ page }) => {
  await page.goto('/#/satnik')
  await expect(page.getByRole('heading', { name: 'Šatník', level: 1 })).toBeVisible()
  const input = page.locator('input[type=file]')
  const manifest = baseManifest('skodlivy', 'Škodlivý', {
    assets: { a: { file: 'assets/a.svg' } },
    roles: { background: { image: 'a', mode: 'repeat' } },
  })

  // SVG se skriptem
  const script = await archiveBytes(page, manifest, {
    'assets/a.svg':
      '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><script>alert(1)</script></svg>',
  })
  await input.setInputFiles({ name: 'skript.drdskin', mimeType: 'application/zip', buffer: script })
  await expect(page.getByText(/SVG obsahuje nepovolený prvek/)).toBeVisible()

  // chybí soubor obrázku
  const missing = await archiveBytes(page, manifest, {})
  await input.setInputFiles({ name: 'chybi.drdskin', mimeType: 'application/zip', buffer: missing })
  await expect(page.getByText(/v archivu chybí soubor assets\/a\.svg/)).toBeVisible()

  // obrázek, který není obrázek
  const fake = await archiveBytes(page, manifest, {
    'assets/a.svg': 'tohle není obrázek, jen delší text bez podpisu',
  })
  await input.setInputFiles({ name: 'falesny.drdskin', mimeType: 'application/zip', buffer: fake })
  await expect(page.getByText(/nepodporovaný druh obrázku/)).toBeVisible()

  await expect(card(page, 'Škodlivý')).toHaveCount(0)
})
