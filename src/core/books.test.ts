import { describe, expect, it } from 'vitest'
import { booksOf, professionBooksOf } from './books'
import type { ContentPack } from './content/schema'

const pack = (id: string, chapters: string[], extra: Partial<ContentPack> = {}): ContentPack =>
  ({
    manifest: { format: 1, id, name: id, version: '1', source: { book: id, edition: '2' } },
    professions: [],
    chapters: chapters.map((c) => ({ id: c, title: c, blocks: [] })),
    ...extra,
  }) as ContentPack

describe('booksOf', () => {
  it('pravidla (s povoláními) jdou první, kapitoly podle ID, prázdné balíčky se vynechají', () => {
    const rules = pack('pravidla', ['31-b', '11-a'], { professions: [{} as never] })
    const bestiary = pack('bestiar', ['12-x', '11-y'])
    const none = pack('nic', [])
    const books = booksOf([bestiary, none, rules])
    expect(books.map((b) => b.id)).toEqual(['pravidla', 'bestiar'])
    expect(books[0].chapters.map((c) => c.id)).toEqual(['11-a', '31-b'])
    expect(books[1].chapters.map((c) => c.id)).toEqual(['11-y', '12-x'])
  })
  it('manifest.order přebíjí výchozí pořadí', () => {
    const a = pack('a', ['1'], { professions: [{} as never] })
    const b = pack('b', ['1'])
    b.manifest.order = 1
    expect(booksOf([a, b]).map((x) => x.id)).toEqual(['b', 'a'])
  })
})

describe('professionBooksOf', () => {
  it('vrátí jen balíčky s povoláními bez kapitol', () => {
    const rules = pack('pravidla', ['11-a'], { professions: [{} as never] })
    const power = pack('mocni', [], { professions: [{ id: 'p', name: 'Paladin' } as never] })
    const empty = pack('nic', [])
    expect(professionBooksOf([rules, power, empty]).map((b) => [b.id, b.professions.length])).toEqual([
      ['mocni', 1],
    ])
  })
})
