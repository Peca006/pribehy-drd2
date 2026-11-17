import { describe, expect, it } from 'vitest'
import { buildIndex, norm, search } from './search'
import type { ContentPack } from './content/schema'

const pack = {
  manifest: { format: 1, id: 'p', name: 'Kniha', version: '1', source: { book: 'K', edition: '2' } },
  professions: [],
  chapters: [
    {
      id: '31-pravidla',
      title: 'Pravidla',
      blocks: [
        { type: 'p', text: 'Úvod k *přesnému* střelci.' },
        { type: 'heading', level: 2, id: 'manevry', text: 'Manévry' },
        { type: 'p', text: 'Mocný manévr zvyšuje Ohrožení.' },
        { type: 'list', items: [{ text: 'Lstivý [manévr](chapter:31-pravidla#manevry)' }] },
      ],
    },
  ],
  creatures: [
    {
      id: 'bytost:vlk',
      name: 'Vlk',
      kind: 'zvirata',
      stats: [{ label: 'Sudba', value: '5' }],
      description: 'Smečkový lovec.',
      sections: [],
    },
  ],
  terms: [{ id: 't:o', name: 'Ohrožení', target: 'chapter:31-pravidla#manevry', summary: 'Zranění.' }],
} as unknown as ContentPack

const index = buildIndex([pack])

describe('search', () => {
  it('norm odstraní diakritiku', () => expect(norm('Přesně ŽLUŤ')).toBe('presne zlut'))

  it('index dělí kapitolu na oddíly s kotvou', () => {
    expect(index.filter((e) => e.kind === 'kapitola').map((e) => e.href)).toEqual([
      '#/ctenar/31-pravidla',
      '#/ctenar/31-pravidla/manevry',
    ])
  })

  it('hledá bez diakritiky a ukáže zvýrazněný úryvek', () => {
    const [h] = search(index, 'presnemu')
    expect(h.entry.href).toBe('#/ctenar/31-pravidla')
    expect(h.snippet.find((s) => s.hit)?.t).toBe('přesnému')
  })

  it('vyžaduje všechna slova a řadí nadpis před textem', () => {
    expect(search(index, 'mocny manevr').map((h) => h.entry.href)).toEqual([
      '#/ctenar/31-pravidla/manevry',
    ])
    expect(search(index, 'mocny vlk')).toEqual([])
    expect(search(index, 'ohrozeni')[0].entry.kind).toBe('pojem')
  })

  it('najde bytost a ignoruje příliš krátký dotaz', () => {
    expect(search(index, 'smeckovy')[0].entry.href).toBe('#/bestiar/bytost%3Avlk')
    expect(search(index, 'v')).toEqual([])
  })
})
