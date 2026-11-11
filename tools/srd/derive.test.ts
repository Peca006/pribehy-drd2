import { describe, expect, it } from 'vitest'
// @ts-expect-error – JS modul bez typů
import {
  deriveEquipment,
  deriveRaces,
  deriveStartingKits,
  deriveTerms,
  parsePrice,
} from './derive.mjs'

// Vymyšlená data – záměrně nejde o obsah pravidel.
const h = (level: number, text: string) => ({
  type: 'heading',
  level,
  id: text.toLowerCase(),
  text,
})
const p = (text: string) => ({ type: 'p', text })

describe('parsePrice', () => {
  it('převádí jednotky na haléře a rozpětí', () => {
    expect(parsePrice('5 haléřů')).toMatchObject({ min: 5 })
    expect(parsePrice('2 groše')).toMatchObject({ min: 20 })
    expect(parsePrice('2 000 grošů')).toMatchObject({ min: 20000 })
    expect(parsePrice('1.320–1.620 grošů')).toMatchObject({ min: 13200, max: 16200 })
    expect(parsePrice('3 dukáty')).toMatchObject({ min: 300 })
    expect(parsePrice('dohodou')).toEqual({ text: 'dohodou' })
  })
})

describe('deriveRaces', () => {
  const chapters = [
    {
      id: '24-rasy',
      blocks: [
        h(2, 'Skřítci'),
        p('***Drobní a hbití.***'),
        p('Popis skřítků.'),
        p('Typická jména jsou:'),
        p('**Muži:** Pip, Pap, Pop'),
        h(3, 'Lesní skřítci'),
        p('O lese.'),
        h(3, 'Zvláštní schopnosti'),
        h(4, 'Hbitost (Tělo, rychlá volba: Lesní skřítci)'),
        p('***Je hbitý.***'),
        p('Text schopnosti.'),
        h(4, 'Šmátrání (Duše)'),
        p('Text.'),
      ],
    },
  ]
  it('rozloží rasu na kultury, jména a schopnosti', () => {
    const { races } = deriveRaces(chapters)
    expect(races).toHaveLength(1)
    const r = races[0]
    expect(r.tagline).toBe('***Drobní a hbití.***')
    expect(r.names).toEqual([{ label: 'Muži', list: ['Pip', 'Pap', 'Pop'] }])
    expect(r.cultures.map((c: { name: string }) => c.name)).toEqual(['Lesní skřítci'])
    expect(r.abilities[0]).toMatchObject({
      name: 'Hbitost',
      attribute: 'Tělo',
      quickPickCulture: 'Lesní skřítci',
      flavor: '***Je hbitý.***',
    })
    expect(r.abilities[1].quickPickCulture).toBeUndefined()
  })
})

describe('deriveEquipment, deriveStartingKits, deriveTerms', () => {
  it('ceník', () => {
    const g = deriveEquipment([
      {
        id: '33-vybaveni',
        blocks: [
          h(2, 'Ceník vybavení'),
          h(3, 'Nářadí'),
          { type: 'table', header: [], align: [], rows: [['kladivo', '3 groše']] },
        ],
      },
    ])
    expect(g[0].items[0]).toMatchObject({ id: 'vybaveni:naradi/kladivo', price: { min: 30 } })
  })
  it('rychlá volba výbavy', () => {
    const k = deriveStartingKits([
      {
        id: '23-tvorba',
        blocks: [
          h(3, 'Rychlá volba počáteční výbavy'),
          h(4, 'Drahá:'),
          { type: 'list', items: [{ text: '**Hotovost:** peníze v hodnotě kopy (60) *grošů*' }] },
        ],
      },
    ])
    expect(k[0]).toMatchObject({ name: 'Drahá', cash: 600 })
  })
  it('pojmy z manévrů', () => {
    const t = deriveTerms([
      {
        id: '31-pravidla',
        blocks: [h(2, 'Manévry'), h(3, 'Obrana'), p('Obrana je štít. Další věta.')],
      },
    ])
    expect(t.map((x: { id: string }) => x.id)).toEqual(['pojem:zakladni-manevry', 'pojem:obrana'])
    expect(t[1].summary).toBe('Obrana je štít.')
  })
})
