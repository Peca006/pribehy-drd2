// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { flushSync } from 'svelte'
import { beforeEach, describe, expect, it } from 'vitest'
import { closeContentDb, installPack } from './content/store'
import { library, refreshLibrary } from './library.svelte'

// Regrese: knihovna musí být REAKTIVNÍ (komponenty se po stažení balíčku překreslí). S `$state.raw` je reaktivní
// jen přiřazení celé proměnné; změna vlastnosti objektu by se neprojevila a pruh o stažení by nezmizel.
beforeEach(async () => {
  await closeContentDb()
  globalThis.indexedDB = new IDBFactory()
  await refreshLibrary()
})

describe('reaktivita knihovny', () => {
  it('efekt se spustí znovu po refreshLibrary (packs i loaded)', async () => {
    const seen: string[] = []
    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(`${library.loaded}:${library.packs.map((p) => p.manifest.id).join(',')}`)
      })
    })
    flushSync()
    await installPack(
      JSON.stringify({
        manifest: { format: 1, id: 'x', name: 'x', version: '1', source: { book: 't', edition: '2' } },
        professions: [],
      }),
    )
    await refreshLibrary()
    flushSync()
    stop()
    expect(seen.at(-1)).toBe('true:x')
    expect(seen.length).toBeGreaterThanOrEqual(2)
  })

  it('čtecí pohled nejde měnit zvenčí', () => {
    expect(() => {
      ;(library as { loaded: boolean }).loaded = false
    }).toThrow()
  })
})
