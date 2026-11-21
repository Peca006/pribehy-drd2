import { describe, expect, it } from 'vitest'
import { sanitizeCharacter } from './drafts'
import { characterOf, emptyCharacter } from './model'
import { sanitizeEvent } from './share'
import {
  adjustTrap,
  removeTrap,
  saveTrap,
  trapCost,
  trapCostLines,
  trapFrom,
  trapList,
  trapsFrom,
  trapSummary,
  useTrap,
} from './traps'

const ok = (r: { character?: unknown; error?: string }) => {
  expect(r.error).toBeUndefined()
  return r.character as ReturnType<typeof emptyCharacter>
}

describe('nástrahy: cena v Surovinách', () => {
  it('základ je 3 a přibývá po jedné za vyřazení, manévr, pokročilý druh a další vlastnosti', () => {
    const base = { type: 'jednoducha' as const, effect: 'ohrozeni' as const, maneuver: '' as const, extra: 0 }
    expect(trapCost(base)).toBe(3)
    expect(trapCost({ ...base, type: 'jed' })).toBe(3)
    expect(trapCost({ ...base, effect: 'vyrazeni' })).toBe(4)
    expect(trapCost({ ...base, maneuver: 'mocne' })).toBe(4)
    expect(trapCost({ ...base, type: 'trask' })).toBe(4)
    expect(trapCost({ ...base, extra: 2 })).toBe(5)
    // vše najednou
    expect(trapCost({ type: 'plynny', effect: 'vyrazeni', maneuver: 'rozsahle', extra: 1 })).toBe(7)
  })

  it('rozpis ceny vypíše jednotlivé příplatky', () => {
    expect(trapCostLines({ type: 'jednoducha', effect: 'ohrozeni', maneuver: '', extra: 0 })).toEqual(['základ 3'])
    expect(trapCostLines({ type: 'trask', effect: 'vyrazeni', maneuver: 'mocne', extra: 2 })).toEqual([
      'základ 3',
      '+1 vyřazení',
      '+1 manévr mocně',
      '+1 pokročilý druh',
      '+2 další vlastnosti',
    ])
  })
})

describe('nástrahy: evidence', () => {
  const trap = { name: 'Jáma s kůly', attribute: 'Tělo' as const, type: 'jednoducha' as const, effect: 'jizva' as const, count: 2 }

  it('vyžaduje název a vlastnost, ostatní doplní výchozími hodnotami', () => {
    expect('error' in saveTrap(emptyCharacter('a'), { name: ' ', attribute: 'Tělo' })).toBe(true)
    expect('error' in saveTrap(emptyCharacter('a'), { name: 'x' })).toBe(true)
    const t = trapFrom({ name: ' Past ', attribute: 'Duše', type: 'nesmysl', effect: 'x', maneuver: 'y', extra: 99, count: -3 })
    expect(t).toEqual({ name: 'Past', attribute: 'Duše', type: 'jina', effect: 'ohrozeni', maneuver: '', extra: 9, weakness: '', note: '', count: 0 })
  })

  it('přidání, úprava, počet a smazání', () => {
    let c = ok(saveTrap(emptyCharacter('a'), trap))
    const id = trapList(c)[0].id
    expect(c.traps[id].count).toBe(2)
    c = adjustTrap(c, id, 3)
    expect(c.traps[id].count).toBe(5)
    c = ok(saveTrap(c, { ...c.traps[id], name: 'Jáma' }, id))
    expect(c.traps[id].name).toBe('Jáma')
    expect('error' in saveTrap(c, trap, 'zzz')).toBe(true)
    expect(Object.keys(ok(removeTrap(c, id)).traps)).toHaveLength(0)
    expect('error' in removeTrap(c, 'zzz')).toBe(true)
  })

  it('použití ubere kus a poslední kus nástrahu z evidence odstraní', () => {
    let c = ok(saveTrap(emptyCharacter('a'), trap))
    const id = trapList(c)[0].id
    c = useTrap(c, id)
    expect(c.traps[id].count).toBe(1)
    c = useTrap(c, id)
    expect(id in c.traps).toBe(false)
    expect(useTrap(c, 'zzz')).toBe(c)
  })

  it('zápis ve stylu pravidel', () => {
    const t = trapFrom({ ...trap, maneuver: 'mocne', weakness: 'prkna pod listím' })!
    expect(trapSummary(t)).toBe('Jáma s kůly (Jednoduchá past > Tělo, mocně / Jizva; slabina: prkna pod listím)')
  })
})

describe('nástrahy: deník, přenos a stará data', () => {
  it('očištění přijatých změn a dat', () => {
    const value = { name: 'Oko', attribute: 'Tělo', type: 'jednoducha', effect: 'jizva', maneuver: '', extra: 0, weakness: '', note: '', count: 2 }
    expect(sanitizeEvent({ id: 'e', path: 'traps.t1', value })).toEqual({ id: 'e', path: 'traps.t1', value })
    expect(sanitizeEvent({ id: 'e', path: 'traps.t1' })).toEqual({ id: 'e', path: 'traps.t1' })
    expect(sanitizeEvent({ id: 'e', path: 'traps.t1', value: { name: '', attribute: 'Tělo' } })).toBeUndefined()
    expect(sanitizeEvent({ id: 'e', path: 'traps.t1.count', value: 3 })).toBeUndefined()
    const many = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`t${i}`, { name: 'x', attribute: 'Tělo' }]))
    expect(Object.keys(trapsFrom(many))).toHaveLength(40)
    expect(trapsFrom([1])).toEqual({})
  })

  it('staré postavy bez nástrah se načtou s prázdným seznamem', () => {
    expect(characterOf({ id: 'a', events: [] }).traps).toEqual({})
    expect(sanitizeCharacter({ name: 'Stará' }, emptyCharacter('a')).traps).toEqual({})
  })
})
