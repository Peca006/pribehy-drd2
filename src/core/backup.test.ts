import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { BACKUP_FORMAT, BACKUP_VERSION, backupFileName, buildBackup, parseBackup, restoreBackup, summarize } from './backup'
import { closeDb, repo, run } from './db'
import { listCharacterImages } from './character/images'

// úložiště v paměti místo localStorage
function memory(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init))
  return {
    m,
    get length() {
      return m.size
    },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  }
}

beforeEach(async () => {
  await closeDb()
  globalThis.indexedDB = new IDBFactory()
})

const log = (id: string, ...paths: string[]) => ({
  id,
  events: paths.map((path, i) => ({ id: `${id}-${i}`, at: '2026-11-22T10:00:00.000Z', by: 'Petr', path, value: `h${i}`, note: 'Tvorba' })),
})
const png = () => new Blob([new Uint8Array([137, 80, 78, 71, 1, 2, 3])], { type: 'image/png' })

async function seed() {
  await repo('characters').put(log('c1', 'name', 'concept') as never)
  await repo('parties').put({ id: 'p1', name: 'Vlci', notes: '', members: [], journal: [], updated: '2026-11-22' } as never)
  await repo('creatures').put({ id: 'vlastni:ork', name: 'Ork' } as never)
  await repo('recipes').put({ id: 'r1', kind: 'kouzlo', name: 'Jiskra', description: '', params: {}, contentHash: 'x', updatedAt: '' } as never)
  await run('characterImages', 'readwrite', (s) => s.put({ id: 'i1', characterId: 'c1', blob: png(), added: 5 }))
}

describe('záloha dat', () => {
  it('záloha a obnova do prázdného zařízení vrátí všechno včetně obrázků a místního stavu', async () => {
    await seed()
    const store = memory({ 'drd2-settings': '{"author":"Petr"}', 'drd2-char-play:c1': '{"spent":{}}', 'drd2-nav': 'ne', jine: 'ne' })
    const text = JSON.stringify(await buildBackup({ storage: store }))

    await closeDb()
    globalThis.indexedDB = new IDBFactory()
    const parsed = parseBackup(text)
    expect(parsed.errors).toEqual([])
    expect(summarize(parsed.backup!)).toEqual({ characters: 1, parties: 1, creatures: 1, recipes: 1, images: 1 })
    expect(Object.keys(parsed.backup!.local).sort()).toEqual(['drd2-char-play:c1', 'drd2-settings'])

    const fresh = memory()
    const res = await restoreBackup(parsed.backup!, 'doplnit', fresh)
    expect(res.added).toEqual({ characters: 1, parties: 1, creatures: 1, recipes: 1, images: 1 })
    expect(await repo('characters').get('c1')).toEqual(log('c1', 'name', 'concept'))
    expect((await repo<{ id: string; name: string }>('parties').get('p1'))?.name).toBe('Vlci')
    const images = await listCharacterImages('c1')
    expect(images).toHaveLength(1)
    expect(images[0].blob.type).toBe('image/png')
    expect(images[0].blob.size).toBe(7)
    expect(fresh.getItem('drd2-char-play:c1')).toBe('{"spent":{}}')
  })

  it('bez ilustrací je soubor menší a obrázky nenese', async () => {
    await seed()
    const b = await buildBackup({ withImages: false, storage: memory() })
    expect(summarize(b).images).toBe(0)
  })

  it('doplnit nepřepisuje, přepsat přepisuje', async () => {
    await seed()
    const b = parseBackup(JSON.stringify(await buildBackup({ storage: memory() }))).backup!
    await repo('characters').put(log('c1', 'name', 'concept', 'xp') as never)
    const mine = memory({ 'drd2-settings': 'moje' })

    const keep = await restoreBackup({ ...b, local: { 'drd2-settings': 'zaloha' } }, 'doplnit', mine)
    expect(keep.kept).toBe(4)
    expect(keep.added.images).toBe(0)
    expect((await repo<{ id: string; events: unknown[] }>('characters').get('c1'))?.events).toHaveLength(3)
    expect(mine.getItem('drd2-settings')).toBe('moje')

    const over = await restoreBackup({ ...b, local: { 'drd2-settings': 'zaloha' } }, 'prepsat', mine)
    expect(over.replaced).toBe(4)
    expect((await repo<{ id: string; events: unknown[] }>('characters').get('c1'))?.events).toHaveLength(2)
    expect(mine.getItem('drd2-settings')).toBe('zaloha')
  })

  it('obrázek postavy, která v zařízení není, se nepřidá', async () => {
    await seed()
    const b = parseBackup(JSON.stringify(await buildBackup({ storage: memory() }))).backup!
    await closeDb()
    globalThis.indexedDB = new IDBFactory()
    const res = await restoreBackup({ ...b, characters: [] }, 'doplnit', memory())
    expect(res.added.images).toBe(0)
    expect(await listCharacterImages('c1')).toHaveLength(0)
  })

  it('záloha nese ID, vlastníka a druh obrázku', async () => {
    await repo('characters').put(log('c1', 'name') as never)
    await run('characterImages', 'readwrite', (s) => s.put({ id: 'abc', characterId: 'c1', blob: png(), added: 1 }))
    const b = await buildBackup({ storage: memory() })
    expect(b.images.characters[0]).toMatchObject({ id: 'abc', owner: 'c1', mime: 'image/png' })
  })
})

describe('čtení souboru zálohy', () => {
  const ok = { format: BACKUP_FORMAT, v: BACKUP_VERSION, created: '', app: '' }

  it('odmítne cizí, poškozený i novější soubor srozumitelně', () => {
    expect(parseBackup('ahoj').errors[0]).toMatch(/JSON/)
    expect(parseBackup('{"format":"jine"}').errors[0]).toMatch(/není záloha/)
    expect(parseBackup(JSON.stringify({ ...ok, v: BACKUP_VERSION + 1 })).errors[0]).toMatch(/novější|Obnovte aplikaci/)
    expect(parseBackup(JSON.stringify({ ...ok, v: 0 })).errors).toHaveLength(1)
  })

  it('vyřadí neplatné záznamy, změny, obrázky a cizí klíče, zbytek zachová', () => {
    const text = JSON.stringify({
      ...ok,
      characters: [
        { id: 'c1', events: [{ id: 'e1', at: 't', by: 'a', path: 'name', value: 'Brokan' }, { id: 'e2', path: 'xp', value: 'ne-cislo' }, 'smetí'] },
        { id: 'c2' },
        { events: [] },
        { id: 'c3', schema: 999, events: [] },
      ],
      parties: [{ id: 'p', name: 'x' }],
      images: {
        characters: [
          { id: 'i1', owner: 'c1', mime: 'image/png', data: 'AAAA', added: 1 },
          { id: 'i2', owner: 'c1', mime: 'text/html', data: 'AAAA' },
          { id: 'i3', owner: 'c1', mime: 'image/png', data: '<script>' },
        ],
      },
      local: { 'drd2-settings': '{}', 'drd2-nav': 'x', 'drd2-char-play:c1': 5 },
    })
    const { backup, dropped, errors } = parseBackup(text)
    expect(errors).toEqual([])
    expect(backup!.characters).toHaveLength(1)
    expect(backup!.characters[0].events).toHaveLength(1)
    expect(dropped).toEqual({ records: 3, events: 2, images: 2, local: 2, newer: 1 })
    expect(backup!.images.characters.map((i) => i.id)).toEqual(['i1'])
    expect(Object.keys(backup!.local)).toEqual(['drd2-settings'])
  })

  it('název souboru nese datum', () => {
    expect(backupFileName(new Date('2026-11-22T10:00:00Z'))).toBe('drd2-zaloha-2026-11-22.json')
  })
})
