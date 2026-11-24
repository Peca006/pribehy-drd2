import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { MAX_TOTAL_PIXELS, readSkinFile, writeSkinFile, type AssetFile } from './file'
import { validateSkin, type Skin } from './skin'
import { closeSkinDb, getSkinAssets, getSkin, installSkinFile, putSkin } from './store'
import { writeZip } from './zip'

// Soubor `.drdskin` s obrázky: čtení, zápis a úložiště (milník 2).

const b64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
const enc = new TextEncoder()
const PNG = b64(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
)
const SVG = enc.encode(
  '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8"/></svg>',
)

const manifest = (extra: Record<string, unknown> = {}) => ({
  schema: 1,
  id: 'obrazkovy',
  name: 'Obrázkový',
  version: '1.0.0',
  author: 'Test',
  license: 'CC0-1.0',
  scheme: 'dark',
  assets: { mramor: { file: 'assets/mramor.svg' }, ram: { file: 'assets/ram.png' } },
  roles: {
    background: { image: 'mramor', mode: 'repeat', size: 64 },
    panel: { image: 'ram', mode: 'slice', slice: [1, 1, 1, 1] },
  },
  ...extra,
})

const archive = (
  m: unknown,
  files: { name: string; data: Uint8Array }[] = [
    { name: 'assets/mramor.svg', data: SVG },
    { name: 'assets/ram.png', data: PNG },
  ],
) => writeZip([{ name: 'manifest.json', data: enc.encode(JSON.stringify(m)) }, ...files])

const make = (extra: Record<string, unknown> = {}): Skin => validateSkin(manifest(extra)).skin!
const assetsOf = (): AssetFile[] => [
  { name: 'mramor', type: 'image/svg+xml', bytes: SVG },
  { name: 'ram', type: 'image/png', bytes: PNG, width: 1, height: 1 },
]

describe('readSkinFile s obrázky', () => {
  it('přečte Háv a vrátí zkontrolované obrázky s typem určeným podle obsahu', async () => {
    const r = await readSkinFile(await archive(manifest()))
    expect(r.ok).toBe(true)
    expect(r.issues).toEqual([])
    expect(r.assets.map((a) => [a.name, a.type]).sort()).toEqual([
      ['mramor', 'image/svg+xml'],
      ['ram', 'image/png'],
    ])
    expect(r.assets.find((a) => a.name === 'ram')).toMatchObject({ width: 1, height: 1 })
    expect(r.assets.find((a) => a.name === 'ram')!.bytes).toEqual(PNG)
  })

  it('přípona nic neznamená: PNG pojmenované .svg se přečte jako PNG', async () => {
    const m = manifest({
      assets: { mramor: { file: 'assets/mramor.svg' }, ram: { file: 'assets/ram.png' } },
    })
    const r = await readSkinFile(
      await archive(m, [
        { name: 'assets/mramor.svg', data: PNG },
        { name: 'assets/ram.png', data: PNG },
      ]),
    )
    expect(r.ok).toBe(true)
    expect(r.assets.find((a) => a.name === 'mramor')!.type).toBe('image/png')
  })

  it.each([
    [
      'text vydávaný za PNG',
      enc.encode('tohle není obrázek, jen delší běžný text bez podpisu souboru'),
      'nepodporovaný druh',
    ],
    [
      'SVG se skriptem',
      enc.encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
      'nepovolený',
    ],
    [
      'SVG s cizím odkazem',
      enc.encode(
        '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://x.example/a.png"/></svg>',
      ),
      'odkazuje mimo',
    ],
    [
      'HTML',
      enc.encode('<html><body onload="x()">ahoj, tohle je stránka</body></html>'),
      'nepodporovaný druh',
    ],
  ])('odmítne obrázek: %s', async (_n, data, fragment) => {
    const r = await readSkinFile(
      await archive(manifest(), [
        { name: 'assets/mramor.svg', data },
        { name: 'assets/ram.png', data: PNG },
      ]),
    )
    expect(r.ok).toBe(false)
    expect(r.skin).toBeNull()
    expect(r.assets).toEqual([])
    expect(r.issues).toContainEqual(
      expect.objectContaining({
        level: 'error',
        path: 'assets.mramor',
        message: expect.stringContaining(fragment),
      }),
    )
  })

  it('chybějící soubor v archivu je chyba s cestou', async () => {
    const r = await readSkinFile(await archive(manifest(), [{ name: 'assets/ram.png', data: PNG }]))
    expect(r.ok).toBe(false)
    expect(r.issues).toContainEqual(
      expect.objectContaining({ level: 'error', path: 'assets.mramor.file' }),
    )
  })

  it('obří rozměry v hlavičce PNG', async () => {
    const huge = PNG.slice()
    new DataView(huge.buffer).setUint32(16, 100000)
    const r = await readSkinFile(
      await archive(manifest(), [
        { name: 'assets/mramor.svg', data: SVG },
        { name: 'assets/ram.png', data: huge },
      ]),
    )
    expect(r.ok).toBe(false)
    expect(r.issues).toContainEqual(
      expect.objectContaining({
        path: 'assets.ram',
        message: expect.stringContaining('větší než'),
      }),
    )
  })

  it('součet pixelů všech obrázků je omezený', async () => {
    const big = PNG.slice()
    new DataView(big.buffer).setUint32(16, 4096)
    new DataView(big.buffer).setUint32(20, 2048) // 8 M pixelů, tři takové překročí limit
    const m = manifest({
      assets: {
        a: { file: 'assets/a.png' },
        b: { file: 'assets/b.png' },
        c: { file: 'assets/c.png' },
      },
      roles: {
        background: { image: 'a', mode: 'repeat' },
        panel: { image: 'b', mode: 'repeat' },
        button: { image: 'c', mode: 'repeat' },
      },
    })
    const r = await readSkinFile(
      await archive(
        m,
        ['a', 'b', 'c'].map((n) => ({ name: `assets/${n}.png`, data: big })),
      ),
    )
    expect(4096 * 2048 * 3).toBeGreaterThan(MAX_TOTAL_PIXELS)
    expect(r.ok).toBe(false)
    expect(r.issues).toContainEqual(
      expect.objectContaining({
        path: 'assets',
        message: expect.stringContaining('příliš mnoho pixelů'),
      }),
    )
  })

  it('soubor, který manifest neodkazuje, varuje a ignoruje se', async () => {
    const r = await readSkinFile(
      await archive(manifest(), [
        { name: 'assets/mramor.svg', data: SVG },
        { name: 'assets/ram.png', data: PNG },
        { name: 'assets/navic.png', data: PNG },
        { name: 'README.txt', data: enc.encode('x') },
      ]),
    )
    expect(r.ok).toBe(true)
    expect(r.assets).toHaveLength(2)
    expect(r.issues.map((i) => i.path).sort()).toEqual(['README.txt', 'assets/navic.png'])
    expect(r.issues.every((i) => i.level === 'warning')).toBe(true)
  })

  it('neplatný manifest: obrázky se nezpracují', async () => {
    const r = await readSkinFile(await archive({ ...manifest(), scheme: 'sepia' }))
    expect(r.ok).toBe(false)
    expect(r.assets).toEqual([])
  })
})

describe('writeSkinFile s obrázky', () => {
  it('zápis a čtení dají stejný Háv i stejné obrázky', async () => {
    const skin = make()
    const back = await readSkinFile(await writeSkinFile(skin, assetsOf()))
    expect(back.ok).toBe(true)
    expect(back.issues).toEqual([])
    expect(back.skin).toEqual(skin)
    expect(back.assets.find((a) => a.name === 'mramor')!.bytes).toEqual(SVG)
  })

  it('chybějící bajty obrázku jsou chyba', async () => {
    await expect(writeSkinFile(make(), [assetsOf()[0]!])).rejects.toThrow(/ram/)
  })

  it('dva názvy na týž soubor se zapíšou jednou', async () => {
    const skin = make({
      assets: { a: { file: 'assets/spolecny.png' }, b: { file: 'assets/spolecny.png' } },
      roles: { background: { image: 'a', mode: 'repeat' }, panel: { image: 'b', mode: 'stretch' } },
    })
    const bytes = await writeSkinFile(skin, [
      { name: 'a', type: 'image/png', bytes: PNG },
      { name: 'b', type: 'image/png', bytes: PNG },
    ])
    const back = await readSkinFile(bytes)
    expect(back.ok).toBe(true)
    expect(back.assets.map((a) => a.name).sort()).toEqual(['a', 'b'])
  })

  it('Háv bez obrázků se zapisuje jako dřív', async () => {
    const skin = validateSkin({ ...manifest(), assets: undefined, roles: undefined }).skin!
    const back = await readSkinFile(await writeSkinFile(skin))
    expect(back.ok).toBe(true)
    expect(back.assets).toEqual([])
  })
})

describe('úložiště s obrázky', () => {
  beforeEach(async () => {
    await closeSkinDb()
    globalThis.indexedDB = new IDBFactory()
  })

  it('uloží a vrátí obrázky; typ a rozměry se určí znovu z obsahu', async () => {
    expect((await putSkin(make(), 1, {}, assetsOf())).ok).toBe(true)
    const back = await getSkinAssets('obrazkovy')
    expect(back.map((a) => [a.name, a.type]).sort()).toEqual([
      ['mramor', 'image/svg+xml'],
      ['ram', 'image/png'],
    ])
    expect(back.find((a) => a.name === 'ram')).toMatchObject({ width: 1, height: 1 })
    expect(back.find((a) => a.name === 'ram')!.bytes).toEqual(PNG)
  })

  it('bez bajtů obrázku, nebo s vadným obrázkem se Háv neuloží', async () => {
    const missing = await putSkin(make(), 1, {}, [assetsOf()[0]!])
    expect(missing.ok).toBe(false)
    expect(missing.issues[0]).toMatchObject({ path: 'assets.ram' })
    const bad = await putSkin(make(), 1, {}, [
      assetsOf()[0]!,
      { name: 'ram', type: 'image/png', bytes: enc.encode('to není PNG, jen text bez podpisu') },
    ])
    expect(bad.ok).toBe(false)
    expect(await getSkin('obrazkovy')).toBeNull()
  })

  it('přepsání Háva nahradí i obrázky', async () => {
    await putSkin(make(), 1, {}, assetsOf())
    const other = new Uint8Array([...SVG, ...enc.encode('<!-- nová verze -->')])
    await putSkin(make(), 2, {}, [
      { name: 'mramor', type: 'image/svg+xml', bytes: other },
      assetsOf()[1]!,
    ])
    expect((await getSkinAssets('obrazkovy')).find((a) => a.name === 'mramor')!.bytes).toEqual(
      other,
    )
  })

  it('obrázky změněné v databázi se při čtení zkontrolují a podvržený se vynechá', async () => {
    await putSkin(make(), 1, {}, assetsOf())
    const db = await new Promise<IDBDatabase>((res, rej) => {
      const r = indexedDB.open('drd2-wardrobe', 1)
      r.onsuccess = () => res(r.result)
      r.onerror = () => rej(r.error)
    })
    const tx = db.transaction('skins', 'readwrite')
    const store = tx.objectStore('skins')
    const get = store.get('obrazkovy')
    get.onsuccess = () => {
      const row = get.result
      row.assets.mramor = {
        data: enc.encode('<svg xmlns="x"><script>alert(1)</script></svg>').buffer,
      }
      delete row.assets.ram
      store.put(row)
    }
    await new Promise((res) => (tx.oncomplete = res))
    db.close()
    expect(await getSkinAssets('obrazkovy')).toEqual([]) // podvržené SVG se zahodí, chybějící PNG také
  })

  it('neexistující Háv nemá žádné obrázky', async () => {
    expect(await getSkinAssets('nic')).toEqual([])
  })

  it('installSkinFile nainstaluje Háv i s obrázky', async () => {
    const r = await installSkinFile(await archive(manifest()), {}, 5)
    expect(r).toMatchObject({ ok: true, replaced: false, skin: { id: 'obrazkovy' } })
    expect((await getSkinAssets('obrazkovy')).map((a) => a.name).sort()).toEqual(['mramor', 'ram'])
  })

  it('installSkinFile s vadným obrázkem nic neuloží', async () => {
    const r = await installSkinFile(
      await archive(manifest(), [
        { name: 'assets/mramor.svg', data: enc.encode('<svg><script>x</script></svg>') },
        { name: 'assets/ram.png', data: PNG },
      ]),
    )
    expect(r.ok).toBe(false)
    expect(await getSkin('obrazkovy')).toBeNull()
  })
})
