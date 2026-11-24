import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { writeSkinFile } from './file'
import { validateSkin, type Skin } from './skin'
import {
  closeSkinDb,
  deleteSkin,
  getSkin,
  installSkinFile,
  listSkins,
  MAX_SKINS,
  putSkin,
} from './store'
import { writeZip } from './zip'

beforeEach(async () => {
  await closeSkinDb()
  globalThis.indexedDB = new IDBFactory()
})

const make = (id: string, name = id, extra: Record<string, unknown> = {}): Skin =>
  validateSkin({
    schema: 1,
    id,
    name,
    version: '1.0.0',
    author: 'T',
    license: 'CC0-1.0',
    scheme: 'dark',
    ...extra,
  }).skin!

describe('úložiště Hávů', () => {
  it('uloží, přečte, vypíše podle názvu a smaže', async () => {
    expect(await listSkins()).toEqual([])
    await putSkin(make('b', 'Žába'), 1000)
    await putSkin(make('a', 'Čáp'), 2000)
    await putSkin(make('c', 'Ahoj'), 3000)
    expect((await listSkins()).map((s) => s.skin.name)).toEqual(['Ahoj', 'Čáp', 'Žába']) // česky: A, Č, Ž
    expect(await getSkin('a')).toMatchObject({ addedAt: 2000, skin: { id: 'a', name: 'Čáp' } })
    expect(await getSkin('nope')).toBeNull()
    await deleteSkin('a')
    expect(await getSkin('a')).toBeNull()
    await deleteSkin('nope') // smazání neexistujícího nevadí
  })

  it('stejné id přepíše Háv, ale ponechá původní datum instalace', async () => {
    expect(await putSkin(make('a', 'Stará'), 1000)).toMatchObject({ ok: true, replaced: false })
    expect(await putSkin(make('a', 'Nová'), 5000)).toMatchObject({ ok: true, replaced: true })
    expect(await getSkin('a')).toMatchObject({ addedAt: 1000, skin: { name: 'Nová' } })
    expect(await listSkins()).toHaveLength(1)
  })

  it('před uložením Háv znovu zvaliduje', async () => {
    const bad = { ...make('a'), tokens: { '--drd-bg': 'url(x)' } } as unknown as Skin
    const r = await putSkin(bad)
    expect(r.ok).toBe(false)
    expect(await listSkins()).toEqual([])
  })

  it('počet Hávů je omezený, přepsání existujícího je ale vždy možné', async () => {
    for (let i = 0; i < MAX_SKINS; i++) expect((await putSkin(make(`s${i}`))).ok).toBe(true)
    const over = await putSkin(make('navic'))
    expect(over.ok).toBe(false)
    expect(over.issues[0]!.message).toContain(String(MAX_SKINS))
    expect((await putSkin(make('s0', 'Přepsaný'))).ok).toBe(true)
  })

  it('poškozený záznam při výpisu přeskočí a neshodí zbytek', async () => {
    await putSkin(make('dobry'))
    const db = await new Promise<IDBDatabase>((res, rej) => {
      const r = indexedDB.open('drd2-wardrobe', 1)
      r.onsuccess = () => res(r.result)
      r.onerror = () => rej(r.error)
    })
    const tx = db.transaction('skins', 'readwrite')
    tx.objectStore('skins').put({ id: 'rozbity', skin: { schema: 1, id: 'rozbity' }, addedAt: 1 })
    tx.objectStore('skins').put({ id: 'jine-id', skin: make('nekdo-jiny'), addedAt: 1 }) // id klíče nesedí s Hávem
    await new Promise((res) => (tx.oncomplete = res))
    db.close()
    expect((await listSkins()).map((s) => s.skin.id)).toEqual(['dobry'])
    expect(await getSkin('rozbity')).toBeNull()
    expect(await getSkin('jine-id')).toBeNull()
  })
})

describe('installSkinFile', () => {
  it('nainstaluje platný soubor', async () => {
    const r = await installSkinFile(
      await writeSkinFile(make('svitek', 'Pergamen', { scheme: 'light' })),
      {},
      42,
    )
    expect(r).toMatchObject({ ok: true, replaced: false, skin: { id: 'svitek' } })
    expect(await getSkin('svitek')).toMatchObject({ addedAt: 42 })
  })

  it('opětovná instalace téhož id je náhrada', async () => {
    const file = await writeSkinFile(make('x'))
    await installSkinFile(file)
    expect(await installSkinFile(file)).toMatchObject({ ok: true, replaced: true })
  })

  it('vadný soubor nic neuloží a vrátí problémy', async () => {
    const r = await installSkinFile(
      await writeZip([{ name: 'readme.txt', data: new TextEncoder().encode('x') }]),
    )
    expect(r).toMatchObject({ ok: false, skin: null })
    expect(r.issues.length).toBeGreaterThan(0)
    expect(await listSkins()).toEqual([])
  })

  it('Háv s chybou kontrastu se neuloží', async () => {
    const bad = { ...make('slepy'), tokens: { '--drd-text': '#1c1a17' } } // tmavý text na tmavém pozadí
    const file = await writeZip([
      { name: 'manifest.json', data: new TextEncoder().encode(JSON.stringify(bad)) },
    ])
    expect((await installSkinFile(file)).ok).toBe(false)
    expect(await getSkin('slepy')).toBeNull()
  })

  it('varování z čtení se zachovají', async () => {
    const files = [
      { name: 'manifest.json', data: new TextEncoder().encode(JSON.stringify(make('a'))) },
      { name: 'assets/x.png', data: new Uint8Array([1]) },
    ]
    const r = await installSkinFile(await writeZip(files))
    expect(r.ok).toBe(true)
    expect(r.issues).toContainEqual(
      expect.objectContaining({ level: 'warning', path: 'assets/x.png' }),
    )
  })
})
