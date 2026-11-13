import { describe, expect, it } from 'vitest'
import { emptyCharacter } from './model'
import { easeScar, healScar, inflictScar } from './healing'

const c = {
  ...emptyCharacter('x'),
  scars: [
    { id: 'a', attribute: 'Tělo' as const, severity: 2, note: '' },
    { id: 'b', attribute: 'Duše' as const, severity: 1, note: '' },
  ],
}

describe('hojení jizev', () => {
  it('zmírní o stupeň a jizvu se závažností 1 zahojí', () => {
    expect(easeScar(c, 'a').scars[0].severity).toBe(1)
    expect(easeScar(c, 'b').scars.map((s) => s.id)).toEqual(['a'])
    expect(easeScar(c, 'zzz')).toEqual(c)
  })
  it('zahojí úplně', () => {
    expect(healScar(c, 'a').scars.map((s) => s.id)).toEqual(['b'])
  })
})

describe('zasazení jizvy', () => {
  const base = { ...emptyCharacter('x'), attributes: { Tělo: 3, Duše: 1, Vliv: 1 } }
  it('sebezasazená jizva dá závažnost + 2 Zdrojů', () => {
    const r = inflictScar(base, { attribute: 'Tělo', severity: 2, note: ' kotník ' }, true, 'n')
    if ('error' in r) throw new Error(r.error)
    expect(r.gain).toBe(4)
    expect(r.character.scars).toEqual([{ id: 'n', attribute: 'Tělo', severity: 2, note: 'kotník' }])
  })
  it('sám si hráč nesníží zdatnost pod 0, jizva jako následek akce ano', () => {
    expect('error' in inflictScar(base, { attribute: 'Duše', severity: 2, note: '' }, true, 'n')).toBe(true)
    const r = inflictScar(base, { attribute: 'Duše', severity: 2, note: '' }, false, 'n')
    expect('error' in r).toBe(false)
    if (!('error' in r)) expect(r.gain).toBe(0)
  })
})
