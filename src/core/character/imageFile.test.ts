// @vitest-environment node
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { closeDb } from '../db'
import { importSharedImages, toSharedImages } from './imageFile'
import { listCharacterImages, putCharacterImage } from './images'
import { sanitizeBundle } from './share'

const bytes = (n: number) => new Uint8Array([n, n + 1, n + 2, 250, 251])

beforeEach(async () => {
  await closeDb()
  globalThis.indexedDB = new IDBFactory()
})

describe('ilustrace postavy v souboru', () => {
  it('přenese obrázky tam a zpět a stejný obrázek podruhé nepřidá', async () => {
    await putCharacterImage('a', new Blob([bytes(1)], { type: 'image/webp' }), 1)
    await putCharacterImage('a', new Blob([bytes(7)], { type: 'image/png' }), 2)
    const shared = await toSharedImages(await listCharacterImages('a'))
    expect(shared.map((s) => s.mime)).toEqual(['image/webp', 'image/png'])

    expect(await importSharedImages('b', shared)).toEqual({ added: 2, skipped: 0 })
    expect(await importSharedImages('b', shared)).toEqual({ added: 0, skipped: 2 })
    const got = await listCharacterImages('b')
    expect(got).toHaveLength(2)
    expect(new Uint8Array(await got[0].blob.arrayBuffer())).toEqual(bytes(1))
    expect(got[1].blob.type).toBe('image/png')
    // k původní postavě se nic nepřidalo
    expect(await listCharacterImages('a')).toHaveLength(2)
  })
})

describe('očištění ilustrací v balíčku', () => {
  const base = { v: 1, type: 'revize', char: 'c', name: 'H', base: null, revisions: [{ id: 'r', at: '2026-11-01T10:00:00.000Z', by: 'P', note: '', events: [{ id: 'e', path: 'name', value: 'H' }] }] }

  it('přijme jen povolené druhy a platný base64, ostatní zahodí', () => {
    const r = sanitizeBundle({
      ...base,
      images: [
        { mime: 'image/webp', data: 'AAEC' },
        { mime: 'text/html', data: 'AAEC' },
        { mime: 'image/png', data: '<script>' },
        { mime: 'image/png', data: '' },
        'nesmysl',
      ],
    })
    expect(r.bundle && 'images' in r.bundle ? r.bundle.images : undefined).toEqual([{ mime: 'image/webp', data: 'AAEC' }])
  })

  it('bez ilustrací pole neexistuje; víc než 12 se ořízne', () => {
    expect(sanitizeBundle(base).bundle).not.toHaveProperty('images')
    const many = Array.from({ length: 20 }, () => ({ mime: 'image/webp', data: 'AAEC' }))
    const r = sanitizeBundle({ ...base, images: many })
    expect(r.bundle && 'images' in r.bundle ? r.bundle.images : []).toHaveLength(12)
  })
})
