import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildBackup, parseBackup, RECORD_STORES, restoreBackup } from './backup'
import { closeDb, DATA_STORES, MIGRATIONS, rawRecords, repo, STORES } from './db'

// Hlídání, že data uživatele přežijí změnu tvaru záznamů. MIGRATIONS jsou dnes prázdné, proto test dočasně přidá
// skutečnou migraci (schéma 1 → 2) a ověří všechny cesty, kudy záznam do úložiště přichází nebo z něj odchází.

const memory = () => ({ length: 0, key: () => null, getItem: () => null, setItem: () => undefined })
const char = (id: string, name: string) => ({
  id,
  events: [{ id: `${id}-1`, at: '2026-11-22T10:00:00.000Z', by: 'Petr', path: 'name', value: name }],
})
const migrate = (r: Record<string, unknown>) => ({ ...r, migrovano: true })

beforeEach(async () => {
  await closeDb()
  globalThis.indexedDB = new IDBFactory()
})
afterEach(() => {
  MIGRATIONS.characters.length = 0
})

describe('úložiště a zálohy se drží pohromadě', () => {
  it('každé úložiště záznamů je v migracích, v upgradu, v záloze i v seznamu úložišť', async () => {
    const stores = [...DATA_STORES].sort()
    expect(Object.keys(MIGRATIONS).sort()).toEqual(stores)
    expect([...RECORD_STORES].sort()).toEqual(stores)
    expect(stores).toEqual(STORES.filter((s) => s !== 'creatureImages' && s !== 'characterImages').sort())
    const backup = await buildBackup({ storage: memory() })
    expect(Object.keys(backup.schemas).sort()).toEqual(stores)
  })
})

describe('migrace záznamů přes zálohu a úložiště', () => {
  it('záloha ze starší verze (schéma 1) se při obnově převede na aktuální schéma', async () => {
    const old = JSON.stringify({
      format: 'drd2-zaloha',
      v: 1,
      created: '2026-11-20T10:00:00.000Z',
      app: '0.5.0',
      characters: [{ ...char('c1', 'Aneta'), schema: 1 }],
      local: {},
    })
    MIGRATIONS.characters.push(migrate)
    const parsed = parseBackup(old)
    expect(parsed.errors).toEqual([])
    await restoreBackup(parsed.backup!, 'doplnit', memory())

    const raw = (await rawRecords('characters')).find((r) => r.id === 'c1')
    expect(raw).toMatchObject({ schema: 2, migrovano: true })
    expect(await repo('characters').get('c1')).toMatchObject({ migrovano: true }) // ven bez pole schema
    expect(await repo('characters').get('c1')).not.toHaveProperty('schema')
  })

  it('záznam uložený před migrací se při čtení převede a události zůstanou', async () => {
    await repo('characters').put(char('c1', 'Aneta') as never) // schéma 1 (zatím žádná migrace)
    MIGRATIONS.characters.push(migrate)
    const got = await repo<{ id: string; events: unknown[]; migrovano?: boolean }>('characters').get('c1')
    expect(got?.migrovano).toBe(true)
    expect(got?.events).toHaveLength(1)
  })

  it('nová záloha nese číslo schématu a záznamy jdou obnovit do prázdného zařízení', async () => {
    MIGRATIONS.characters.push(migrate)
    await repo('characters').put(char('c1', 'Aneta') as never)
    const text = JSON.stringify(await buildBackup({ storage: memory() }))
    expect(JSON.parse(text).schemas.characters).toBe(2)
    await closeDb()
    globalThis.indexedDB = new IDBFactory()
    const parsed = parseBackup(text)
    expect(parsed.errors).toEqual([])
    await restoreBackup(parsed.backup!, 'doplnit', memory())
    // čtení záloh záznam očistí na známá pole (cizí `migrovano` zahodí), schéma a události zůstanou
    expect(await repo('characters').get('c1')).toMatchObject({ id: 'c1', events: [{ value: 'Aneta' }] })
    expect((await rawRecords('characters')).find((r) => r.id === 'c1')?.schema).toBe(2)
  })

  it('záznam z novější verze aplikace se do zálohy nepřevezme a stávající data nepřepíše', async () => {
    await repo('characters').put(char('c1', 'Aneta') as never)
    const newer = JSON.stringify({
      format: 'drd2-zaloha',
      v: 1,
      created: '2026-12-01T10:00:00.000Z',
      app: '9.9.9',
      characters: [{ ...char('c1', 'Podvrh'), schema: 7 }],
      local: {},
    })
    const parsed = parseBackup(newer)
    expect(parsed.backup).toBeDefined()
    await restoreBackup(parsed.backup!, 'prepsat', memory())
    const got = await repo<{ id: string; events: { value: string }[] }>('characters').get('c1')
    expect(got?.events[0].value).toBe('Aneta')
  })
})
