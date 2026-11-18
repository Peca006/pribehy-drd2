/// <reference types="node" />
import 'fake-indexeddb/auto'
import { createHash } from 'node:crypto'
import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { library, refreshLibrary } from '../library.svelte'
import { closeContentDb } from './store'
import { canDownload, download, downloads, loadCatalog, pending, sizeMb } from './downloads.svelte'
import type { CatalogEntry } from './remote'

const packJson = (id: string) =>
  JSON.stringify({
    manifest: { format: 1, source: { book: 'test', edition: '2' }, id, name: id, version: '1.0.0', build: 1 },
    professions: [],
  })
const sha = (s: string) => createHash('sha256').update(s).digest('hex')
const entry = (id: string, json: string): CatalogEntry => ({
  id,
  name: id,
  version: '1.0.0',
  build: 1,
  file: `${id}.json`,
  size: 1048576,
  sha256: sha(json),
})

const a = packJson('pa')
const b = packJson('pb')
const catalog = () => ({ format: 1, packs: [entry('pa', a), entry('pb', b)] })

function mock(cat = catalog(), catalogOk = true) {
  const files: Record<string, string> = {
    'index.json': JSON.stringify(cat),
    'pa.json': a,
    'pb.json': b,
  }
  const fn = vi.fn(async (url: string) => {
    if (url.endsWith('index.json') && !catalogOk) return new Response('x', { status: 503 })
    const hit = Object.entries(files).find(([k]) => url.endsWith(k))
    return hit ? new Response(hit[1]) : new Response('', { status: 404 })
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

beforeEach(async () => {
  await closeContentDb()
  globalThis.indexedDB = new IDBFactory()
  downloads.catalog = null
  downloads.error = ''
  downloads.busy = false
  await refreshLibrary()
})
afterEach(() => vi.unstubAllGlobals())

// loadCatalog si pamatuje úspěšný příslib; jednotlivé testy proto nespoléhají na jeho opakované volání
describe('stav stahování', () => {
  it('katalog ukáže, co chybí, a velikost', async () => {
    mock()
    await loadCatalog()
    expect(canDownload()).toBe(true)
    expect(pending().map((e) => e.id)).toEqual(['pa', 'pb'])
    expect(sizeMb(pending())).toBe('2')
  })

  it('download() nainstaluje všechny chybějící a obnoví knihovnu', async () => {
    mock()
    downloads.catalog = catalog().packs
    await download()
    expect(library.packs.map((p) => p.manifest.id).sort()).toEqual(['pa', 'pb'])
    expect(pending()).toEqual([])
    expect(downloads.busy).toBe(false)
    expect(downloads.error).toBe('')
  })

  it('chyba u druhého balíčku zastaví stahování, první zůstane a chyba je vidět', async () => {
    mock()
    const cat = catalog()
    cat.packs[1].sha256 = 'x'.repeat(64)
    downloads.catalog = cat.packs
    await download()
    expect(downloads.error).toMatch(/poškozený/)
    expect(library.packs.map((p) => p.manifest.id)).toEqual(['pa'])
    expect(downloads.busy).toBe(false)
    expect(pending().map((e) => e.id)).toEqual(['pb'])
  })

  it('souběžné stahování se ignoruje', async () => {
    const fn = mock()
    downloads.catalog = catalog().packs
    await Promise.all([download(), download()])
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('download() bez katalogu a bez chybějících balíčků nic nestahuje', async () => {
    const fn = mock()
    await download()
    expect(fn).not.toHaveBeenCalled()
  })
})
