import { describe, expect, it } from 'vitest'
import { sanitizeCharacter } from './drafts'
import { characterOf, emptyCharacter } from './model'
import {
  adjustPotion,
  consumePotions,
  potionFrom,
  potionLabel,
  potionList,
  potionsFor,
  potionsFrom,
  removePotion,
  savePotion,
} from './potions'
import { sanitizeEvent } from './share'

const ok = (r: { character?: unknown; error?: string }) => {
  expect(r.error).toBeUndefined()
  return r.character as ReturnType<typeof emptyCharacter>
}

const stocked = () => {
  let c = emptyCharacter('a')
  c = ok(savePotion(c, { attribute: 'Tělo', scar: 'popálenina', count: 3 }, undefined))
  c = ok(savePotion(c, { attribute: 'Duše', scar: 'fobie', count: 2, note: 'do slunovratu' }, undefined))
  return c
}

describe('lektvary: evidence', () => {
  it('lektvar vyžaduje vlastnost a druh Jizvy', () => {
    expect('error' in savePotion(emptyCharacter('a'), { attribute: 'Tělo', scar: '  ' })).toBe(true)
    expect('error' in savePotion(emptyCharacter('a'), { scar: 'ruka' })).toBe(true)
    expect(potionFrom({ attribute: 'Vliv', scar: 'nesmělost', count: -4 })).toEqual({
      attribute: 'Vliv',
      scar: 'nesmělost',
      count: 0,
      note: '',
    })
  })

  it('seznam, filtr podle vlastnosti a popis', () => {
    const c = stocked()
    expect(potionList(c).map((p) => p.potion.scar)).toEqual(['popálenina', 'fobie'])
    expect(potionsFor(c, 'Tělo')).toHaveLength(1)
    expect(potionsFor(c, 'Vliv')).toHaveLength(0)
    expect(potionLabel(potionList(c)[0].potion)).toBe('popálenina (Tělo)')
  })

  it('úprava, počet a smazání', () => {
    const c = stocked()
    const id = potionList(c)[0].id
    const more = adjustPotion(c, id, 2)
    expect(more.potions[id].count).toBe(5)
    expect(adjustPotion(c, id, -99).potions[id].count).toBe(0)
    const edited = ok(savePotion(c, { attribute: 'Tělo', scar: 'řezná rána', count: 1 }, id))
    expect(edited.potions[id].scar).toBe('řezná rána')
    expect('error' in savePotion(c, { attribute: 'Tělo', scar: 'x' }, 'zzz')).toBe(true)
    expect(Object.keys(ok(removePotion(c, id)).potions)).toHaveLength(1)
    expect('error' in removePotion(c, 'zzz')).toBe(true)
  })

  it('spotřeba při léčení: vyčerpaný lektvar zmizí, přebytek a neznámé ID se ignorují', () => {
    const c = stocked()
    const [a, b] = potionList(c).map((p) => p.id)
    const r = consumePotions(c, { [a]: 1, [b]: 99, zzz: 5 })
    expect(r.potions[a].count).toBe(2)
    expect(b in r.potions).toBe(false)
  })
})

describe('lektvary: deník, přenos a stará data', () => {
  it('očištění přijatých změn a dat', () => {
    expect(sanitizeEvent({ id: 'e', path: 'potions.p1', value: { attribute: 'Tělo', scar: 'popálenina', count: 3 } })).toEqual({
      id: 'e',
      path: 'potions.p1',
      value: { attribute: 'Tělo', scar: 'popálenina', count: 3, note: '' },
    })
    expect(sanitizeEvent({ id: 'e', path: 'potions.p1' })).toEqual({ id: 'e', path: 'potions.p1' })
    expect(sanitizeEvent({ id: 'e', path: 'potions.p1', value: { attribute: 'Síla', scar: 'x', count: 1 } })).toBeUndefined()
    expect(sanitizeEvent({ id: 'e', path: 'potions.p1.count', value: 3 })).toBeUndefined()
    const many = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`p${i}`, { attribute: 'Tělo', scar: 'x', count: 1 }]))
    expect(Object.keys(potionsFrom(many))).toHaveLength(40)
    expect(potionsFrom([1])).toEqual({})
  })

  it('staré postavy bez lektvarů se načtou s prázdným seznamem', () => {
    expect(characterOf({ id: 'a', events: [] }).potions).toEqual({})
    expect(sanitizeCharacter({ name: 'Stará' }, emptyCharacter('a')).potions).toEqual({})
  })
})
