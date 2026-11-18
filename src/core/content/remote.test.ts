/// <reference types="node" />
import 'fake-indexeddb/auto'
import { createHash } from 'node:crypto'
import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { closeContentDb, listPacks, removePack } from './store'
import { downloadPack, fetchCatalog, needsUpdate, type CatalogEntry } from './remote'
import type { ContentPack } from './schema'

const packJson = (id: string, version = '1.0.0', build = 1) =>
  JSON.stringify({
    manifest: { format: 1, source: { book: 'test', edition: '2' }, id, name: id, version, build },
    professions: [],
  })

const entryFor = (json: string, id: string, version = '1.0.0', build = 1): CatalogEntry => ({
  id,
  name: id,
  version,
  build,
  file: `${id}.json`,
  size: json.length,
  sha256: createHash('sha256').update(json).digest('hex'),
})

/** `fetch` s pevnými odpověďmi podle koncovky adresy (číslo = stavový kód chyby) */
function mockFetch(files: Record<string, string | number>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const hit = Object.entries(files).find(([k]) => url.endsWith(k))
      if (!hit) return new Response('nenalezeno', { status: 404 })
      return typeof hit[1] === 'number'
        ? new Response('chyba', { status: hit[1] })
        : new Response(hit[1], { status: 200 })
    }),
  )
}

beforeEach(async () => {
  await closeContentDb()
  globalThis.indexedDB = new IDBFactory()
})
afterEach(() => vi.unstubAllGlobals())

describe('katalog balíčků', () => {
  it('načte platný katalog', async () => {
    const e = entryFor(packJson('a'), 'a')
    mockFetch({ 'packs/index.json': JSON.stringify({ format: 1, packs: [e] }) })
    expect(await fetchCatalog()).toEqual([e])
  })

  it('chyba serveru, cizí formát i stránka místo JSON dají čitelnou chybu', async () => {
    mockFetch({ 'packs/index.json': 500 })
    await expect(fetchCatalog()).rejects.toThrow('nepodařilo načíst')
    mockFetch({ 'packs/index.json': JSON.stringify({ format: 2, packs: [] }) })
    await expect(fetchCatalog()).rejects.toThrow('Neznámý formát')
    mockFetch({ 'packs/index.json': '<!doctype html><title>aplikace</title>' })
    await expect(fetchCatalog()).rejects.toThrow('Neznámý formát')
  })
})

describe('stažení balíčku', () => {
  it('ověří kontrolní součet a nainstaluje', async () => {
    const json = packJson('drd2-test')
    mockFetch({ 'packs/drd2-test.json': json })
    const pack = await downloadPack(entryFor(json, 'drd2-test'))
    expect(pack.manifest.id).toBe('drd2-test')
    expect((await listPacks()).map((p) => p.manifest.id)).toEqual(['drd2-test'])
  })

  it('poškozený soubor se nenainstaluje', async () => {
    const json = packJson('drd2-test')
    mockFetch({ 'packs/drd2-test.json': json.replace('drd2-test', 'drd2-hack') })
    await expect(downloadPack(entryFor(json, 'drd2-test'))).rejects.toThrow('poškozený')
    expect(await listPacks()).toEqual([])
  })

  it('chyba serveru se nahlásí a nic se nenainstaluje', async () => {
    mockFetch({ 'packs/drd2-test.json': 404 })
    await expect(downloadPack(entryFor(packJson('drd2-test'), 'drd2-test'))).rejects.toThrow('nezdařilo')
    expect(await listPacks()).toEqual([])
  })

  it('neplatný balíček se správným součtem se odmítne při ověření obsahu', async () => {
    const json = JSON.stringify({ manifest: { format: 99, id: 'x', name: 'x', version: '1' } })
    mockFetch({ 'packs/x.json': json })
    await expect(downloadPack(entryFor(json, 'x'))).rejects.toThrow('není platný')
  })

  it('nová instalace přepíše starší verzi téhož balíčku', async () => {
    const v1 = packJson('drd2-test', '1.0.0')
    const v2 = packJson('drd2-test', '1.1.0')
    mockFetch({ 'packs/drd2-test.json': v1 })
    await downloadPack(entryFor(v1, 'drd2-test', '1.0.0'))
    mockFetch({ 'packs/drd2-test.json': v2 })
    await downloadPack(entryFor(v2, 'drd2-test', '1.1.0'))
    const [p] = await listPacks()
    expect(p.manifest.version).toBe('1.1.0')
    await removePack('drd2-test')
    expect(await listPacks()).toEqual([])
  })
})

describe('potřeba aktualizace', () => {
  const inst = (version: string, build?: number) =>
    ({ manifest: { version, build } }) as unknown as ContentPack
  const e = entryFor('x', 'x', '2.0.0', 2)

  it('chybějící, jiná verze nebo nižší sestavení = aktualizovat', () => {
    expect(needsUpdate(e, undefined)).toBe(true)
    expect(needsUpdate(e, inst('1.0.0', 2))).toBe(true)
    expect(needsUpdate(e, inst('2.0.0', 1))).toBe(true)
    expect(needsUpdate(e, inst('2.0.0'))).toBe(true)
    expect(needsUpdate(e, inst('2.0.0', 2))).toBe(false)
  })
})
