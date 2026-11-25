import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildBackup, parseBackup, restoreBackup, summarize } from './backup'
import { closeDb, repo, run, STORES } from './db'

// Upgrade z každé dřívější verze databáze na aktuální: data uživatele zůstanou, nová úložiště jsou použitelná.
// Sady úložišť podle verzí: 4–5 postavy, bytosti, obrázky bytostí, družiny; 6 + předpisy; 7 + ilustrace postav;
// 8 + dobrodružství, výpravy, vedení; 9 + sezení.

const BASE = ['characters', 'creatures', 'creatureImages', 'parties']
const STORES_BY_VERSION: Record<number, string[]> = {
  4: BASE,
  5: BASE,
  6: [...BASE, 'recipes'],
  7: [...BASE, 'recipes', 'characterImages'],
  8: [...BASE, 'recipes', 'characterImages', 'adventures', 'expeditions', 'runs'],
}

const RECORDS: Record<string, Record<string, unknown>> = {
  characters: { id: 'c1', events: [{ id: 'e1', at: '2026-11-01T10:00:00.000Z', by: 'Petr', path: 'name', value: 'Aneta' }] },
  creatures: { id: 'vlastni:ork', name: 'Ork' },
  parties: { id: 'p1', name: 'Vlci', notes: '', members: [{ id: 'm1', name: 'Aneta' }], journal: [], updated: '2026-11-01' },
  recipes: { id: 'r1', kind: 'kouzlo', name: 'Jiskra', description: '', params: {}, contentHash: 'x', updatedAt: '' },
  adventures: { id: 'a1', name: 'Stará cesta', expeditionIds: ['x1'] },
  expeditions: { id: 'x1', name: 'Hrad', adventureId: 'a1', nodes: [], incidents: [] },
  runs: { id: 'r9', name: 'Hra', partyId: 'p1', expeditionId: 'x1', status: 'bezi', reachedNodes: [], incidents: {}, extra: [], loot: {}, notes: '' },
}

async function createOldDb(version: number) {
  const stores = STORES_BY_VERSION[version]
  const db = await new Promise<IDBDatabase>((res, rej) => {
    const req = indexedDB.open('drd2-data', version)
    req.onupgradeneeded = () => {
      for (const s of stores) req.result.createObjectStore(s, { keyPath: 'id' })
    }
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
  const records = Object.keys(RECORDS).filter((s) => stores.includes(s))
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(records, 'readwrite')
    for (const s of records) tx.objectStore(s).put(RECORDS[s])
    tx.oncomplete = () => res()
    tx.onerror = () => rej(tx.error)
  })
  db.close()
  return records
}

beforeEach(async () => {
  await closeDb()
  globalThis.indexedDB = new IDBFactory()
})

describe('upgrade databáze na aktuální verzi', () => {
  for (const version of [4, 5, 6, 7, 8]) {
    it(`z verze ${version}: staré záznamy zůstanou, všechna úložiště existují a sezení jde uložit`, async () => {
      const records = await createOldDb(version)

      for (const s of records) {
        const found = await repo<{ id: string }>(s as never).get(RECORDS[s].id as string)
        expect(found, `${s} z verze ${version}`).toEqual(RECORDS[s])
      }

      // všechna úložiště aktuální verze existují (i ta, která stará verze neměla)
      const names = await run<unknown[]>('sittings', 'readonly', (s) => s.getAll()).then(() =>
        new Promise<string[]>((res, rej) => {
          const req = indexedDB.open('drd2-data')
          req.onsuccess = () => {
            const n = [...req.result.objectStoreNames]
            req.result.close()
            res(n)
          }
          req.onerror = () => rej(req.error)
        }),
      )
      expect(names.sort()).toEqual([...STORES].sort())

      // nové úložiště sezení funguje a ilustrace mají indexy
      const sittings = repo<{ id: string; partyId: string }>('sittings')
      await sittings.put({ id: 's1', partyId: 'p1' })
      expect(await sittings.get('s1')).toEqual({ id: 's1', partyId: 'p1' })
      await run('characterImages', 'readwrite', (s) => s.put({ id: 'i1', characterId: 'c1', blob: 'x', added: 1 }))
      expect(await run<unknown[]>('characterImages', 'readonly', (s) => s.index('characterId').getAll('c1'))).toHaveLength(1)
    })
  }

  it('upgrade je opakovatelný: druhé otevření nic nezmění', async () => {
    await createOldDb(8)
    expect(await repo('characters').list()).toHaveLength(1)
    await closeDb()
    expect(await repo('characters').list()).toHaveLength(1)
    expect(await repo('runs').list()).toHaveLength(1)
  })

  it('záloha ze zařízení po upgradu jde obnovit do prázdného zařízení', async () => {
    await createOldDb(8)
    await repo('sittings').put({ id: 's1', partyId: 'p1', status: 'hotovo', started: 1, spans: [] } as never)
    const text = JSON.stringify(await buildBackup({ storage: { length: 0, key: () => null, getItem: () => null, setItem: () => undefined } }))
    await closeDb()
    globalThis.indexedDB = new IDBFactory()
    const parsed = parseBackup(text)
    expect(parsed.errors).toEqual([])
    expect(summarize(parsed.backup!)).toMatchObject({ characters: 1, parties: 1, creatures: 1, runs: 1, sittings: 1 })
    await restoreBackup(parsed.backup!, 'doplnit', { setItem: () => undefined, getItem: () => null, length: 0, key: () => null })
    expect(await repo('sittings').get('s1')).toBeDefined()
    expect(await repo('runs').get('r9')).toBeDefined()
  })
})

describe('starší soubor zálohy (před sezeními)', () => {
  const old = JSON.stringify({
    format: 'drd2-zaloha',
    v: 1,
    created: '2026-11-20T10:00:00.000Z',
    app: '0.5.0',
    characters: [RECORDS.characters],
    parties: [RECORDS.parties],
    creatures: [],
    recipes: [],
    local: {},
  })

  it('bez klíčů adventures, runs a sittings se přečte a obnoví', async () => {
    const parsed = parseBackup(old)
    expect(parsed.errors).toEqual([])
    expect(summarize(parsed.backup!)).toMatchObject({ characters: 1, parties: 1, adventures: 0, expeditions: 0, runs: 0, sittings: 0 })
    await restoreBackup(parsed.backup!, 'doplnit', { setItem: () => undefined, getItem: () => null, length: 0, key: () => null })
    expect(await repo('characters').get('c1')).toBeDefined()
    expect(await repo('sittings').list()).toEqual([])
  })
})
