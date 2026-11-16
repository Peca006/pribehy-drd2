import { describe, expect, it } from 'vitest'
import { characterOf } from './model'
import { addCoin, canSpend, cashFrom, formatCash, fromHeller, spendCoin, totalHeller } from './cash'

const c = (dukaty: number, grose: number, halere: number) => ({ dukaty, grose, halere })

describe('hotovost: dukáty, groše, haléře', () => {
  it('z haléřů se rozloží nejkratším zápisem a zpět dá stejnou hodnotu', () => {
    expect(fromHeller(235)).toEqual(c(2, 3, 5))
    expect(fromHeller(0)).toEqual(c(0, 0, 0))
    expect(fromHeller(-3)).toEqual(c(0, 0, 0))
    expect(totalHeller(c(2, 3, 5))).toBe(235)
  })

  it('plus nepřetéká: haléřů i grošů může být víc než 9', () => {
    let x = c(0, 0, 9)
    x = addCoin(x, 'halere')
    expect(x).toEqual(c(0, 0, 10))
    x = addCoin(c(0, 9, 0), 'grose')
    expect(x).toEqual(c(0, 10, 0))
  })

  it('čerpání pod nulu rozmění jednu minci shora', () => {
    expect(spendCoin(c(0, 3, 0), 'halere')).toEqual({ cash: c(0, 2, 9), brokeDucat: false })
    expect(spendCoin(c(1, 0, 0), 'grose')).toEqual({ cash: c(0, 9, 0), brokeDucat: true })
    expect(spendCoin(c(1, 0, 0), 'halere')).toEqual({ cash: c(0, 9, 9), brokeDucat: true })
    // dostatek mincí dané hodnoty: nic se nerozměňuje, vyšší řád se nemění
    expect(spendCoin(c(2, 3, 5), 'halere')).toEqual({ cash: c(2, 3, 4), brokeDucat: false })
    expect(spendCoin(c(2, 3, 5), 'dukaty')).toEqual({ cash: c(1, 3, 5), brokeDucat: false })
  })

  it('dukát se nerozměňuje na nic a bez prostředků nejde utratit', () => {
    expect(spendCoin(c(0, 0, 0), 'halere')).toBeUndefined()
    expect(spendCoin(c(0, 5, 5), 'dukaty')).toBeUndefined()
    expect(canSpend(c(0, 0, 1), 'grose')).toBe(false)
    expect(canSpend(c(0, 1, 0), 'halere')).toBe(true)
  })

  it('rozdělení haléře zachová celkovou hodnotu', () => {
    const before = c(1, 0, 0)
    const after = spendCoin(before, 'halere')!.cash
    expect(totalHeller(after)).toBe(totalHeller(before) - 1)
  })

  it('starý formát (číslo v haléřích) i nový se z neznámých dat načtou', () => {
    expect(cashFrom(235)).toEqual(c(2, 3, 5))
    expect(cashFrom({ dukaty: 1, grose: 12, halere: 3 })).toEqual(c(1, 12, 3))
    expect(cashFrom({ dukaty: -1, grose: 'x' })).toEqual(c(0, 0, 0))
    expect(cashFrom(undefined)).toEqual(c(0, 0, 0))
    expect(cashFrom(null)).toEqual(c(0, 0, 0))
  })

  it('čitelný zápis bez převodů', () => {
    expect(formatCash(c(2, 0, 13))).toBe('2 dukáty 13 haléřů')
    expect(formatCash(c(0, 0, 0))).toBe('0 grošů')
    expect(formatCash(c(1, 1, 1))).toBe('1 dukát 1 groš 1 haléř')
  })
})

describe('hotovost: starší záznamy deníku', () => {
  it('změna celé hotovosti jedním číslem v haléřích se při přehrání převede na tři počty', () => {
    const log = { id: 'a', events: [{ id: '1', at: '2026-01-01T00:00:00Z', by: 'x', path: 'cash', value: 235 }] }
    expect(characterOf(log).cash).toEqual(c(2, 3, 5))
    const next = { id: 'b', at: '2026-01-02T00:00:00Z', by: 'x', path: 'cash.halere', value: 12 }
    expect(characterOf({ id: 'a', events: [...log.events, next] }).cash).toEqual(c(2, 3, 12))
  })
})
