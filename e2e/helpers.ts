/// <reference lib="dom" />
import type { Page } from '@playwright/test'

/** Smaže ukázkové (i jiné) předpisy z Grimoáru a stránku načte znovu: zkoušky počítají s prázdným Grimoárem. */
export async function clearRecipes(page: Page) {
  // aplikace se vykreslí až po zavedení ukázkových dat, teprve pak jsou předpisy v úložišti
  await page.getByRole('navigation', { name: 'Hlavní navigace' }).waitFor()
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('drd2-data')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const db = open.result
          if (!db.objectStoreNames.contains('recipes')) return db.close(), resolve()
          const tx = db.transaction('recipes', 'readwrite')
          tx.objectStore('recipes').clear()
          tx.oncomplete = () => (db.close(), resolve())
          tx.onerror = () => reject(tx.error)
        }
      }),
  )
  await page.reload()
}

/** Přečte všechny záznamy úložiště IndexedDB (zkoušky tak počkají, až se změna opravdu uloží, a ne jen vykreslí). */
export async function readStore<T = unknown>(page: Page, store: string): Promise<T[]> {
  return page.evaluate(
    (name) =>
      new Promise<unknown[]>((resolve, reject) => {
        const open = indexedDB.open('drd2-data')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const db = open.result
          if (!db.objectStoreNames.contains(name)) return db.close(), resolve([])
          const req = db.transaction(name).objectStore(name).getAll()
          req.onsuccess = () => (db.close(), resolve(req.result))
          req.onerror = () => reject(req.error)
        }
      }),
    store,
  ) as Promise<T[]>
}
