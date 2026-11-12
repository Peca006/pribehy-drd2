import { describe, expect, it } from 'vitest'
import type { Block } from './content/schema'
import { NO_LINK, parseInline } from './markdown'
import { limitTermLinks } from './termLinks'

const index = new Map([
  ['sudba', 'pojem:sudba'],
  ['sudby', 'pojem:sudba'],
  ['manévry', 'pojem:manevry'],
])
const home = (id: string) => (id === 'pojem:manevry' ? '31-pravidla' : '43-bestiar')
const ctx = (chapterId: string) => ({ index, homeChapter: home, chapterId })
const p = (text: string): Block => ({ type: 'p', text })

describe('limitTermLinks', () => {
  it('odkaz má jen první výskyt pojmu v kapitole (i v seznamech a tabulkách)', () => {
    const out = limitTermLinks(
      [
        p('***Sudba*** a ***Sudby***'),
        { type: 'list', items: [{ text: '***sudba***' }] },
        { type: 'table', header: ['x'], align: ['left'], rows: [['***Sudby***']] },
      ],
      ctx('35-x'),
    )
    expect((out[0] as { text: string }).text).toBe(`***Sudba*** a ${NO_LINK}***Sudby***`)
    expect((out[1] as { items: { text: string }[] }).items[0].text).toBe(`${NO_LINK}***sudba***`)
    expect((out[2] as { rows: string[][] }).rows[0][0]).toBe(`${NO_LINK}***Sudby***`)
  })

  it('pojem vysvětlený v téže kapitole nemá žádný odkaz; neznámý pojem se nemění', () => {
    const out = limitTermLinks([p('***Manévry*** ***neznámý*** ***Sudba***')], ctx('31-pravidla'))
    expect((out[0] as { text: string }).text).toBe(`${NO_LINK}***Manévry*** ***neznámý*** ***Sudba***`)
  })

  it('původní bloky se nemění a vnořené bloky se zpracují', () => {
    const src: Block[] = [{ type: 'quote', blocks: [p('***Sudba*** ***Sudba***')] }]
    const out = limitTermLinks(src, ctx('x'))
    expect(JSON.stringify(src)).not.toContain(NO_LINK)
    expect(JSON.stringify(out)).toContain(NO_LINK)
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
