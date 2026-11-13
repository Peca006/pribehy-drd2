import { beforeEach, describe, expect, it } from 'vitest'
import { emptyCharacter } from './model'
import {
  adjust,
  effectiveAttributes,
  emptyBonus,
  loadBonus,
  loadSpent,
  saveBonus,
  saveSpent,
} from './play'

const store = new Map<string, string>()
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
} as Storage
beforeEach(() => store.clear())

describe('zdatnost po jizvách a čerpání Zdrojů', () => {
  const c = { ...emptyCharacter('a'), attributes: { Tělo: 6, Duše: 5, Vliv: 4 } }

  it('jizvy snižují zdatnost své vlastnosti, nejméně na 0', () => {
    expect(effectiveAttributes(c)).toEqual({ Tělo: 6, Duše: 5, Vliv: 4 })
    const s = {
      ...c,
      scars: [
        { id: '1', attribute: 'Tělo' as const, severity: 2, note: '' },
        { id: '2', attribute: 'Tělo' as const, severity: 1, note: '' },
        { id: '3', attribute: 'Vliv' as const, severity: 5, note: '' },
      ],
    }
    expect(effectiveAttributes(s)).toEqual({ Tělo: 3, Duše: 5, Vliv: 0 })
  })

  it('čerpání a obnova zůstanou v mezích 0 až maximum a ukládají se', () => {
    const max = { Tělo: 3, Duše: 2, Vliv: 0 }
    let sp = loadSpent('a')
    expect(sp).toEqual({ Tělo: 0, Duše: 0, Vliv: 0 })
    sp = adjust(sp, max, 'Tělo', 5)
    expect(sp.Tělo).toBe(3)
    sp = adjust(sp, max, 'Tělo', -1)
    expect(sp.Tělo).toBe(2)
    expect(adjust(sp, max, 'Vliv', 1).Vliv).toBe(0)
    expect(adjust(sp, max, 'Duše', -3).Duše).toBe(0)
    saveSpent('a', sp)
    expect(loadSpent('a').Tělo).toBe(2)
    store.set('drd2-char-play:b', '{x')
    expect(loadSpent('b')).toEqual({ Tělo: 0, Duše: 0, Vliv: 0 })
  })
})

describe('dočasné Zdroje z jizvy', () => {
  it('ukládají se a prázdné se odstraní', () => {
    expect(loadBonus('b')).toEqual(emptyBonus())
    saveBonus('b', { ...emptyBonus(), Tělo: 3 })
    expect(loadBonus('b').Tělo).toBe(3)
    saveBonus('b', emptyBonus())
    expect(store.has('drd2-char-bonus:b')).toBe(false)
  })
})
