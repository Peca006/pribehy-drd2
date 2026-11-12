// Úložiště dat uživatele v IndexedDB (oddělené od obsahových balíčků). Verze se zvyšuje při přidání
// nového úložiště; stávající data zůstávají.
const DB = 'drd2-data'
const VERSION = 4
export const STORES = ['characters', 'creatures', 'creatureImages', 'parties'] as const
export type StoreName = (typeof STORES)[number]

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, VERSION)
    req.onupgradeneeded = () => {
      for (const s of STORES)
        if (!req.result.objectStoreNames.contains(s))
          req.result.createObjectStore(s, { keyPath: 'id' })
      // obrázky bytostí: víc k jedné bytosti, hledají se podle `creatureId`
      const images = req.transaction!.objectStore('creatureImages')
      if (!images.indexNames.contains('creatureId')) images.createIndex('creatureId', 'creatureId')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function run<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(store, mode).objectStore(store))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
