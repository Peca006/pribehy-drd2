import { describe, expect, it } from 'vitest'
import { MANIFEST_NAME, MAX_SKIN_FILE_BYTES, readSkinFile, writeSkinFile } from './file'
import { MAX_MANIFEST_BYTES, validateSkin } from './skin'
import { writeZip } from './zip'

const enc = new TextEncoder()
const manifest = (extra: Record<string, unknown> = {}) => ({
  schema: 1,
  id: 'noc',
  name: 'Noc',
  version: '1.0.0',
  author: 'Test',
  license: 'CC0-1.0',
  scheme: 'dark',
  tokens: { '--drd-accent': '#ffcc33' },
  ...extra,
})
const zipOf = (json: string | Uint8Array, extraFiles: { name: string; data: Uint8Array }[] = []) =>
  writeZip([
    { name: MANIFEST_NAME, data: typeof json === 'string' ? enc.encode(json) : json },
    ...extraFiles,
  ])

describe('readSkinFile', () => {
  it('přečte platný soubor', async () => {
    const r = await readSkinFile(await zipOf(JSON.stringify(manifest())))
    expect(r.ok).toBe(true)
    expect(r.skin).toMatchObject({
      id: 'noc',
      scheme: 'dark',
      tokens: { '--drd-accent': '#ffcc33' },
    })
  })

  it('toleruje BOM na začátku manifestu', async () => {
    const r = await readSkinFile(
      await zipOf(String.fromCharCode(0xfeff) + JSON.stringify(manifest())),
    )
    expect(r.ok).toBe(true)
  })

  it('předává volby validace (minApp)', async () => {
    const z = await zipOf(JSON.stringify(manifest({ minApp: '9.0.0' })))
    const r = await readSkinFile(z, { appVersion: '0.5.0' })
    expect(r.ok).toBe(false)
    expect(r.issues[0]).toMatchObject({ level: 'error', path: 'minApp' })
  })

  it('ostatní soubory zatím ignoruje s varováním', async () => {
    const r = await readSkinFile(
      await zipOf(JSON.stringify(manifest()), [
        { name: 'assets/bg.png', data: new Uint8Array([1, 2, 3]) },
      ]),
    )
    expect(r.ok).toBe(true)
    expect(r.issues).toContainEqual({
      level: 'warning',
      path: 'assets/bg.png',
      message: expect.any(String),
    })
  })

  it('chyby validace se vrací, Háv ne', async () => {
    const r = await readSkinFile(
      await zipOf(JSON.stringify(manifest({ tokens: { '--drd-bg': 'url(x)' } }))),
    )
    expect(r.ok).toBe(false)
    expect(r.skin).toBeNull()
    expect(r.issues[0]).toMatchObject({ path: 'tokens.--drd-bg' })
  })

  it.each([
    [
      'chybějící manifest',
      () => writeZip([{ name: 'readme.txt', data: enc.encode('x') }]),
      'chybí manifest',
    ],
    [
      'manifest ve složce',
      () => writeZip([{ name: 'x/manifest.json', data: enc.encode('{}') }]),
      'chybí manifest',
    ],
    ['špatný JSON', () => zipOf('{ nope'), 'JSON'],
    ['neplatné UTF-8', () => zipOf(new Uint8Array([0x7b, 0xff, 0xfe, 0x7d])), 'JSON'],
    [
      'příliš velký manifest',
      () => zipOf(JSON.stringify(manifest({ note: 'x'.repeat(MAX_MANIFEST_BYTES) }))),
      'manifest je větší',
    ],
    [
      'nepodporované schema',
      () => zipOf(JSON.stringify(manifest({ schema: 99 }))),
      'verze formátu',
    ],
    [
      'text místo ZIPu',
      async () => enc.encode('ahoj, to není skin, jen text a nic víc než text'),
      'ZIP',
    ],
    ['prázdný soubor', async () => new Uint8Array(), 'ZIP'],
  ])('%s: vrátí chybu místo výjimky', async (_name, make, fragment) => {
    const r = await readSkinFile(await make())
    expect(r.ok).toBe(false)
    expect(r.skin).toBeNull()
    expect(r.issues.some((i) => i.level === 'error' && i.message.includes(fragment))).toBe(true)
  })

  it('odmítne soubor nad limit velikosti dřív, než se pokusí o rozbalení', async () => {
    const r = await readSkinFile(new Uint8Array(MAX_SKIN_FILE_BYTES + 1))
    expect(r.ok).toBe(false)
    expect(r.issues[0]!.message).toContain('MB')
  })
})

describe('writeSkinFile', () => {
  it('zápis a čtení dají stejný Háv', async () => {
    const skin = validateSkin(
      manifest({
        variants: [
          {
            when: { width: 'compact', orientation: 'landscape' },
            tokens: { '--drd-gap': '0.5rem' },
          },
        ],
      }),
    ).skin!
    const back = await readSkinFile(await writeSkinFile(skin))
    expect(back.ok).toBe(true)
    expect(back.issues).toEqual([])
    expect(back.skin).toEqual(skin)
  })
})
