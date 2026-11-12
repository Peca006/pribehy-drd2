import { describe, expect, it } from 'vitest'
import type { Block, Creature } from './content/schema'
import { NO_LINK, parseInline } from './markdown'
import { limitCreatureLinks, limitTermLinks, SPACING, type TermLinkContext } from './termLinks'

const index = new Map([
  ['sudba', 'pojem:sudba'],
  ['sudby', 'pojem:sudba'],
  ['manévry', 'pojem:manevry'],
])
const homes: Record<string, { chapter: string; anchor: string }> = {
  'pojem:manevry': { chapter: '31-pravidla', anchor: 'manevry' },
  'pojem:sudba': { chapter: '43-bestiar', anchor: 'sudba' },
}
const ctx = (chapterId: string, mode: TermLinkContext['mode'] = 'first'): TermLinkContext => ({
  mode,
  index,
  home: (id) => homes[id],
  chapterId,
})
const p = (text: string): Block => ({ type: 'p', text })
const text = (b: Block) => (b as { text: string }).text

describe('limitTermLinks', () => {
  it('first: odkaz má jen první výskyt pojmu (i v seznamech a tabulkách)', () => {
    const out = limitTermLinks(
      [
        p('***Sudba*** a ***Sudby***'),
        { type: 'list', items: [{ text: '***sudba***' }] },
        { type: 'table', header: ['x'], align: ['left'], rows: [['***Sudby***']] },
      ],
      ctx('35-x'),
    )
    expect(text(out[0])).toBe(`***Sudba*** a ${NO_LINK}***Sudby***`)
    expect((out[1] as { items: { text: string }[] }).items[0].text).toBe(`${NO_LINK}***sudba***`)
    expect((out[2] as { rows: string[][] }).rows[0][0]).toBe(`${NO_LINK}***Sudby***`)
  })

  it('pojem vysvětlený v téže kapitole se odkazuje jen před místem vysvětlení', () => {
    const out = limitTermLinks(
      [
        p('***Manévry*** ***neznámý***'),
        { type: 'heading', level: 2, id: 'manevry', text: 'Manévry' },
        p('***Manévry***'),
      ],
      ctx('31-pravidla'),
    )
    expect(text(out[0])).toBe('***Manévry*** ***neznámý***')
    expect(text(out[2])).toBe(`${NO_LINK}***Manévry***`)
    // v jiné kapitole stejný text odkaz dostane
    expect(text(limitTermLinks([p('***Manévry***')], ctx('35-x'))[0])).toBe('***Manévry***')
  })

  it('spaced: odkaz se zopakuje až po dlouhém textu', () => {
    const filler = p('x'.repeat(SPACING))
    const out = limitTermLinks(
      [p('***Sudba***'), p('***Sudba***'), filler, p('***Sudba***'), p('***Sudba***')],
      ctx('35-x', 'spaced'),
    )
    expect(out.map(text).filter((t) => t.includes('***'))).toEqual([
      '***Sudba***',
      `${NO_LINK}***Sudba***`,
      '***Sudba***',
      `${NO_LINK}***Sudba***`,
    ])
  })

  it('all nic nemění, none odebere všechny odkazy', () => {
    const src = [p('***Sudba*** ***Sudba***')]
    expect(limitTermLinks(src, ctx('x', 'all'))).toEqual(src)
    expect(text(limitTermLinks(src, ctx('x', 'none'))[0])).toBe(
      `${NO_LINK}***Sudba*** ${NO_LINK}***Sudba***`,
    )
  })

  it('původní bloky se nemění a vnořené bloky se zpracují', () => {
    const src: Block[] = [{ type: 'quote', blocks: [p('***Sudba*** ***Sudba***')] }]
    const out = limitTermLinks(src, ctx('x'))
    expect(JSON.stringify(src)).not.toContain(NO_LINK)
    expect(JSON.stringify(out)).toContain(NO_LINK)
  })
})

describe('limitCreatureLinks', () => {
  it('pojem má odkaz jen u prvního výskytu napříč kartou bytosti', () => {
    const c: Creature = {
      id: 'x',
      name: 'X',
      kind: 'k',
      stats: [{ label: 'Sudba', value: '***Sudba*** 3' }],
      description: '***Sudby*** a ***manévry***',
      sections: [{ id: 's', title: 'S', text: '***Sudba*** ***Manévry***' }],
    }
    const out = limitCreatureLinks(c, ctx(''))
    expect(out.stats[0].value).toBe('***Sudba*** 3')
    expect(out.description).toBe(`${NO_LINK}***Sudby*** a ***manévry***`)
    expect(out.sections[0].text).toBe(`${NO_LINK}***Sudba*** ${NO_LINK}***Manévry***`)
  })
})

describe('parseInline: značka NO_LINK', () => {
  it('pojem za značkou je `plain` a značka se neobjeví v textu', () => {
    const n = parseInline(`a ${NO_LINK}***pojem*** b ***jiný***`)
    expect(n[0]).toEqual({ t: 'text', v: 'a ' })
    expect(n[1]).toMatchObject({ t: 'term', plain: true })
    expect(n[3]).toEqual({ t: 'term', c: [{ t: 'text', v: 'jiný' }] })
  })
})
