import { describe, expect, it } from 'vitest'
import { breaksDucat, canChange, formatDelta, splitCash, UNIT } from './cash'

describe('hotovost: dukáty, groše, haléře', () => {
  it('rozloží částku v haléřích', () => {
    expect(splitCash(0)).toEqual({ dukaty: 0, grose: 0, halere: 0 })
    expect(splitCash(235)).toEqual({ dukaty: 2, grose: 3, halere: 5 })
    expect(splitCash(1099)).toEqual({ dukaty: 10, grose: 9, halere: 9 })
    expect(splitCash(-5)).toEqual({ dukaty: 0, grose: 0, halere: 0 })
  })

  it('plus na 9 přeteče do vyššího řádu', () => {
    expect(splitCash(9 + UNIT.halere)).toEqual({ dukaty: 0, grose: 1, halere: 0 })
    expect(splitCash(99 + UNIT.halere)).toEqual({ dukaty: 1, grose: 0, halere: 0 })
    // groš nad 9 přeteče do dukátu a haléře zůstanou
    expect(splitCash(95 + UNIT.grose)).toEqual({ dukaty: 1, grose: 0, halere: 5 })
  })

  it('mínus na 0 si půjčí z vyššího řádu, nižší zůstane', () => {
    // 1 dukát 0 grošů 5 haléřů: groš −1 → 0 dukátů, 9 grošů, 5 haléřů
    expect(splitCash(105 - UNIT.grose)).toEqual({ dukaty: 0, grose: 9, halere: 5 })
    // haléř −1 z 1 dukát 0 grošů 0 haléřů → 0 dukátů 9 grošů 9 haléřů
    expect(splitCash(100 - UNIT.halere)).toEqual({ dukaty: 0, grose: 9, halere: 9 })
  })

  it('částka nejde pod nulu', () => {
    expect(canChange(5, -5)).toBe(true)
    expect(canChange(5, -6)).toBe(false)
    expect(canChange(0, UNIT.dukaty)).toBe(true)
  })

  it('dotaz „rozměnit dukát“ jen při půjčce z dukátů z grošů nebo haléřů', () => {
    expect(breaksDucat(100, 'halere', -1)).toBe(true)
    expect(breaksDucat(105, 'grose', -1)).toBe(true)
    expect(breaksDucat(110, 'grose', -1)).toBe(false) // v grošech je z čeho brát
    expect(breaksDucat(100, 'dukaty', -1)).toBe(false) // ubírá se přímo dukát
    expect(breaksDucat(99, 'halere', 1)).toBe(false) // přičítání se neptá
    expect(breaksDucat(5, 'grose', -1)).toBe(false) // nejde ani provést
  })

  it('čitelný zápis změny', () => {
    expect(formatDelta(0)).toBe('0')
    expect(formatDelta(20)).toBe('+2 groše')
    expect(formatDelta(-105)).toBe('−1 dukát 5 haléřů')
    expect(formatDelta(1)).toBe('+1 haléř')
  })
})
