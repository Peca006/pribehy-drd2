// Úložiště dat uživatele v IndexedDB (oddělené od obsahových balíčků).
//
// Verze schématu záznamů: každý uložený záznam (postava, družina, bytost) nese číslo `schema`; bez něj je
// to schéma 1. Změna tvaru záznamu = přidat funkci do `MIGRATIONS` daného úložiště (index 0 převádí
// schéma 1 → 2, index 1 schéma 2 → 3, …) a zvýšit `VERSION`: při upgradu databáze se migrují všechny záznamy
// a při čtení se pro jistotu zkontroluje ještě jednou. Pole `schema` se při čtení odstraní, ven z úložiště
// (sdílení, export) nikdy nejde. Záznam s vyšším schématem, než aplikace zná, se nemění.
import { connection } from './idb'

const DB = 'drd2-data'
const VERSION = 7
export const STORES = ['characters', 'creatures', 'creatureImages', 'characterImages', 'parties', 'recipes'] as const
export type StoreName = (typeof STORES)[number]

/** Úložiště se záznamy s číslem schématu (obrázky bytostí a postav jsou jen binární data). */
export type DataStore = Exclude<StoreName, 'creatureImages' | 'characterImages'>

export type Migration = (record: Record<string, unknown>) => Record<string, unknown>

/** Převody mezi schématy: `MIGRATIONS[store][i]` převádí schéma i+1 na i+2. */
export const MIGRATIONS: Record<DataStore, Migration[]> = {
  characters: [],
  creatures: [],
  parties: [],
  recipes: [],
}

/** Aktuální schéma = počet migrací + 1. */
export const schemaOf = (store: DataStore, migrations = MIGRATIONS): number =>
  migrations[store].length + 1

/** Převede záznam na aktuální schéma (čistá funkce; vstup nemění). */
export function migrateRecord(
  store: DataStore,
  record: Record<string, unknown>,
  migrations = MIGRATIONS,
): Record<string, unknown> {
  const current = schemaOf(store, migrations)
  let v = typeof record.schema === 'number' && record.schema >= 1 ? Math.floor(record.schema) : 1
  if (v > current) return record
  let r = { ...record }
  for (; v < current; v++) r = migrations[store][v - 1](r)
  return { ...r, schema: current }
}

/** Záznam přečtený z úložiště: aktuální schéma, bez pole `schema`. */
function fromDb<T>(store: DataStore, raw: Record<string, unknown>): T {
  const { schema: _schema, ...rest } = migrateRecord(store, raw)
  return rest as T
}

const conn = connection(DB, VERSION, (req, oldVersion) => {
  const db = req.result
  for (const s of STORES)
    if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' })
  // obrázky bytostí: víc k jedné bytosti, hledají se podle `creatureId`
  const images = req.transaction!.objectStore('creatureImages')
  if (!images.indexNames.contains('creatureId')) images.createIndex('creatureId', 'creatureId')
  // ilustrace postav: víc k jedné postavě, hledají se podle `characterId`
  const portraits = req.transaction!.objectStore('characterImages')
  if (!portraits.indexNames.contains('characterId')) portraits.createIndex('characterId', 'characterId')
  // migrace existujících záznamů (v jedné transakci s upgradem: buď se povede celá, nebo žádná)
  if (oldVersion > 0)
    for (const s of ['characters', 'creatures', 'parties'] as const) {
      const cursor = req.transaction!.objectStore(s).openCursor()
      cursor.onsuccess = () => {
        const c = cursor.result
        if (!c) return
        c.update(migrateRecord(s, c.value))
        c.continue()
      }
    }
})

export const closeDb = () => conn.close()

export async function run<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await conn.db()
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(store, mode).objectStore(store))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** Úložiště záznamů s klíčem `id`: čte s migrací a bez `schema`, zapisuje s aktuálním `schema`. */
export function repo<T extends { id: string }>(store: DataStore) {
  return {
    list: async () =>
      (await run<Record<string, unknown>[]>(store, 'readonly', (s) => s.getAll())).map((r) =>
        fromDb<T>(store, r),
      ),
    get: async (id: string) => {
      const r = await run<Record<string, unknown> | undefined>(store, 'readonly', (s) => s.get(id))
      return r ? fromDb<T>(store, r) : undefined
    },
    put: (record: T) =>
      run(store, 'readwrite', (s) => s.put({ ...record, schema: schemaOf(store) })),
    remove: (id: string) => run(store, 'readwrite', (s) => s.delete(id)),
  }
}
