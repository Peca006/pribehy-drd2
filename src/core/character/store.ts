import { characterOf, type ChangeEvent, type CharacterLog } from './model'

// Úložiště deníků postav v IndexedDB (oddělené od obsahových balíčků).
const DB = 'drd2-data'
const STORE = 'characters'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run<T>(
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export const listLogs = () => run<CharacterLog[]>('readonly', (s) => s.getAll())
export const getLog = (id: string) => run<CharacterLog | undefined>('readonly', (s) => s.get(id))
export const saveLog = (log: CharacterLog) => run('readwrite', (s) => s.put(log))
export const deleteLog = (id: string) => run('readwrite', (s) => s.delete(id))

export async function appendEvents(id: string, events: ChangeEvent[]): Promise<CharacterLog> {
  const log = (await getLog(id)) ?? { id, events: [] }
  log.events = [...log.events, ...events]
  await saveLog(log)
  return log
}

export { characterOf }
