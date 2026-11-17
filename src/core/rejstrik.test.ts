import { describe, expect, it } from 'vitest'
import { buildRejstrik, resolveTarget } from './rejstrik'
import type { Book } from './books'
import type { Term } from './content/schema'

const books = [
  {
    id: 'a',
    name: 'Pravidla',
    chapters: [
      { id: '11-uvod', title: 'Úvod', blocks: [] },
      {
        id: '31-hra',
        title: 'Hra',
        blocks: [
          { type: 'heading', level: 2, id: 'zdroje', text: 'Zdroje' },
          { type: 'heading', level: 2, id: 'hod', text: 'Hod kostkami' },
        ],
      },
    ],
  },
  { id: 'b', name: 'Bestiář', chapters: [{ id: '11-bytosti', title: 'Bytosti', blocks: [] }] },
  { id: 'c', name: 'Prázdná', chapters: [] },
] as unknown as Book[]

const term = (id: string, name: string, target: string): Term => ({ id, name, target })

describe('rejstřík', () => {
  it('resolveTarget dává odkaz a popisek s názvem oddílu; neznámá kapitola nic', () => {
    expect(resolveTarget('chapter:31-hra#zdroje', books)).toEqual({
      href: '#/ctenar/31-hra/zdroje',
      label: 'Hra › Zdroje',
    })
    expect(resolveTarget('chapter:11-uvod', books)).toEqual({ href: '#/ctenar/11-uvod', label: 'Úvod' })
    expect(resolveTarget('chapter:neni#x', books)).toBeUndefined()
  })

  it('na začátku odkazy na první kapitolu každé knihy (prázdné knihy se vynechají)', () => {
    expect(buildRejstrik([], books).starts).toEqual([
      { href: '#/ctenar/11-uvod', label: 'Pravidla' },
      { href: '#/ctenar/11-bytosti', label: 'Bestiář' },
    ])
  })

  it('řadí česky, seskupuje podle písmene a píše velké první písmeno; Ch je zvlášť za H', () => {
    const terms = [
      term('1', 'chyba', 'chapter:31-hra#hod'),
      term('2', 'hod', 'chapter:31-hra#hod'),
      term('3', 'čas', 'chapter:31-hra#hod'),
      term('4', 'cena', 'chapter:31-hra#hod'),
    ]
    const g = buildRejstrik(terms, books).groups
    expect(g.map((x) => x.letter)).toEqual(['C', 'Č', 'H', 'Ch'])
    expect(g[2].entries[0].name).toBe('Hod')
  })

  it('shrnutí pojmu se ukazuje bez markdownu', () => {
    const t = { id: 'x', name: 'zdroje', target: 'chapter:31-hra#zdroje', summary: 'Jsou *dvojí* a [odkaz](term:x).' }
    expect(buildRejstrik([t], books).groups[0].entries[0].summary).toBe('Jsou dvojí a odkaz.')
  })

  it('další místa z ručního souboru jdou do závorky, duplicity a neznámé cíle se vynechají', () => {
    const terms = [term('pojem:zdroje', 'zdroje', 'chapter:31-hra#zdroje')]
    const { groups } = buildRejstrik(terms, books, {
      terms: { 'pojem:zdroje': ['chapter:31-hra#zdroje', 'chapter:11-uvod', 'chapter:neni#x'] },
      entries: [{ name: 'Vlastní heslo', targets: ['chapter:11-bytosti'] }],
    })
    const z = groups.flatMap((x) => x.entries).find((e) => e.name === 'Zdroje')!
    expect(z.main.href).toBe('#/ctenar/31-hra/zdroje')
    expect(z.also).toEqual([{ href: '#/ctenar/11-uvod', label: 'Úvod' }])
    expect(groups.flatMap((x) => x.entries).some((e) => e.name === 'Vlastní heslo')).toBe(true)
  })
})
