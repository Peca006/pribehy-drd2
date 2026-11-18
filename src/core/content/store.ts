import { connection } from '../idb'
import type { ContentPack } from './schema'
import { validatePack } from './validate'

// Úložiště nainstalovaných obsahových balíčků v IndexedDB (oddělené od dat hráčů).
const DB = 'drd2-content'
const STORE = 'packs'

const conn = connection(DB, 1, (req) => {
  if (!req.result.objectStoreNames.contains(STORE))
    req.result.createObjectStore(STORE, { keyPath: 'manifest.id' })
})

/** Zavře sdílené připojení (testy). */
export const closeContentDb = () => conn.close()

async function run<T>(
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await conn.db()
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export const listPacks = () => run<ContentPack[]>('readonly', (s) => s.getAll())
export const removePack = (id: string) => run('readwrite', (s) => s.delete(id))

/** Ověří a uloží balíček z JSON textu; při chybě vyhodí Error s čitelným popisem. */
export async function installPack(json: string): Promise<ContentPack> {
  let pack: ContentPack
  try {
    pack = JSON.parse(json)
  } catch {
    throw new Error('Soubor není platný JSON.')
  }
  const errors = validatePack(pack)
  if (errors.length) throw new Error(`Balíček není platný:\n${errors.slice(0, 5).join('\n')}`)
  await run('readwrite', (s) => s.put(pack))
  return pack
}
