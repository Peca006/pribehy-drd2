// Sdílené připojení k IndexedDB: otevře se jednou a znovu se použije (dřív se otevíralo při každé operaci
// a nezavíralo). Když jiná karta či nová verze aplikace chce upgradovat databázi (`versionchange`),
// připojení se zavře a příště se otevře znovu, aby upgrade nezůstal zablokovaný.

export interface Connection {
  /** Otevřené připojení (při prvním použití se otevře). */
  db(): Promise<IDBDatabase>
  /** Zavře připojení; další `db()` ho otevře znovu (testy, odhlášení). */
  close(): Promise<void>
}

export function connection(
  name: string,
  version: number,
  upgrade: (req: IDBOpenDBRequest, oldVersion: number) => void,
): Connection {
  let opened: Promise<IDBDatabase> | undefined

  const open = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(name, version)
      req.onupgradeneeded = (e) => upgrade(req, e.oldVersion)
      req.onsuccess = () => {
        const db = req.result
        db.onversionchange = () => {
          db.close()
          opened = undefined
        }
        db.onclose = () => {
          opened = undefined
        }
        resolve(db)
      }
      req.onerror = () => reject(req.error)
      // jiná karta drží starší verzi a nezavřela ji: čekáme, ale dáme vědět
      req.onblocked = () => console.warn(`IndexedDB „${name}“: čeká na zavření jiné karty aplikace.`)
    })

  return {
    db() {
      opened ??= open().catch((err) => {
        opened = undefined
        throw err
      })
      return opened
    },
    async close() {
      const p = opened
      opened = undefined
      if (p) (await p.catch(() => undefined))?.close()
    },
  }
}
