import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { closeDb, migrateRecord, repo, run, schemaOf, type Migration } from './db'
import { connection } from './idb'

// čerstvá databáze pro každý test
beforeEach(async () => {
  await closeDb()
  globalThis.indexedDB = new IDBFactory()
})

const migs = (...m: Migration[]) => ({ characters: m, creatures: [], parties: [] })

describe('migrace záznamů (čistá funkce)', () => {
  it('záznam bez čísla je schéma 1 a po migraci nese aktuální číslo', () => {
    const m = migs((r) => ({ ...r, renamed: r.old, old: undefined }), (r) => ({ ...r, extra: 1 }))
    expect(schemaOf('characters', m)).toBe(3)
    expect(migrateRecord('characters', { id: 'a', old: 'x' }, m)).toMatchObject({
      id: 'a',
      renamed: 'x',
      extra: 1,
      schema: 3,
    })
  })

  it('částečně migrovaný záznam pokračuje od svého schématu', () => {
    const m = migs(() => {
      throw new Error('schéma 1 → 2 se nemá spustit')
    }, (r) => ({ ...r, extra: 1 }))
    expect(migrateRecord('characters', { id: 'a', schema: 2 }, m)).toMatchObject({ extra: 1, schema: 3 })
  })

  it('záznam z novější verze se nemění', () => {
    const rec = { id: 'a', schema: 99, novinka: true }
    expect(migrateRecord('characters', rec, migs((r) => ({ ...r, x: 1 })))).toBe(rec)
  })

  it('vstup se nemění', () => {
    const rec = { id: 'a' }
    migrateRecord('characters', rec, migs((r) => ({ ...r, x: 1 })))
    expect(rec).toEqual({ id: 'a' })
  })
})

describe('úložiště záznamů', () => {
  const chars = repo<{ id: string; events: unknown[] }>('characters')

  it('uloží, přečte, vypíše a smaže; ven jde záznam bez pole schema', async () => {
    await chars.put({ id: 'a', events: [] })
    await chars.put({ id: 'b', events: [1] })
    expect(await chars.get('a')).toEqual({ id: 'a', events: [] })
    expect((await chars.list()).map((c) => c.id).sort()).toEqual(['a', 'b'])
    await chars.remove('a')
    expect(await chars.get('a')).toBeUndefined()
  })

  it('v databázi je záznam označen aktuálním schématem', async () => {
    await chars.put({ id: 'a', events: [] })
    const raw = await run<Record<string, unknown>>('characters', 'readonly', (s) => s.get('a'))
    expect(raw.schema).toBe(schemaOf('characters'))
  })

  it('opakovaná volání sdílejí jedno připojení', async () => {
    const opened: unknown[] = []
    const real = indexedDB.open.bind(indexedDB)
    indexedDB.open = ((...a: Parameters<typeof real>) => (opened.push(a), real(...a))) as typeof real
    await closeDb()
    await Promise.all([chars.list(), chars.list(), chars.get('x')])
    await chars.list()
    expect(opened).toHaveLength(1)
  })
})

describe('upgrade ze starší databáze', () => {
  it('záznamy z verze 4 bez čísla schématu se po upgradu čtou a dostanou schéma', async () => {
    // databáze přesně jako ve verzi 4 (bez pole `schema`)
    const old = await new Promise<IDBDatabase>((res, rej) => {
      const req = indexedDB.open('drd2-data', 4)
      req.onupgradeneeded = () => {
        for (const s of ['characters', 'creatures', 'creatureImages', 'parties'])
          req.result.createObjectStore(s, { keyPath: 'id' })
      }
      req.onsuccess = () => res(req.result)
      req.onerror = () => rej(req.error)
    })
    await new Promise<void>((res, rej) => {
      const tx = old.transaction('characters', 'readwrite')
      tx.objectStore('characters').put({ id: 'stara', events: [{ n: 1 }] })
      tx.oncomplete = () => res()
      tx.onerror = () => rej(tx.error)
    })
    old.close()

    expect(await repo<{ id: string; events: unknown[] }>('characters').get('stara')).toEqual({
      id: 'stara',
      events: [{ n: 1 }],
    })
    const raw = await run<Record<string, unknown>>('characters', 'readonly', (s) => s.get('stara'))
    expect(raw.schema).toBe(1)
  })
})

describe('sdílené připojení', () => {
  it('při upgradu z jiné karty se zavře, takže upgrade neuvázne', async () => {
    const c = connection('test-db', 1, (req) => req.result.createObjectStore('s'))
    await c.db()
    // „nová verze aplikace v jiné kartě“ otevře vyšší verzi: stará karta musí připojení pustit
    const upgraded = await new Promise<IDBDatabase>((res, rej) => {
      const req = indexedDB.open('test-db', 2)
      req.onsuccess = () => res(req.result)
      req.onerror = () => rej(req.error)
      req.onblocked = () => rej(new Error('zablokováno'))
    })
    expect(upgraded.version).toBe(2)
    upgraded.close()
  })

  it('selhání otevření se nezapamatuje (další pokus to zkusí znovu)', async () => {
    let fail = true
    const c = connection('test-db2', 1, (req) => {
      if (fail) throw new Error('upgrade selhal')
      req.result.createObjectStore('s')
    })
    await expect(c.db()).rejects.toBeDefined()
    fail = false
    await expect(c.db()).resolves.toBeDefined()
  })
})
