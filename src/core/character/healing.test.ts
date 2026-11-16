import { describe, expect, it } from 'vitest'
import { emptyCharacter } from './model'
import { applyHeal, autoPay, checkHeal, easeScar, healCost, healScar, inflictScar, maxSteps } from './healing'

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
    expect(
      'error' in inflictScar(base, { attribute: 'Duše', severity: 2, note: '' }, true, 'n'),
    ).toBe(true)
    const r = inflictScar(base, { attribute: 'Duše', severity: 2, note: '' }, false, 'n')
    expect('error' in r).toBe(false)
    if (!('error' in r)) expect(r.gain).toBe(0)
  })
})

describe('zmírnění Jizvy léčením', () => {
  // Tělo 8 s Jizvou 3 (zbývá 5), Duše 4 s Jizvou 1 (zbývá 3), Vliv 6
  const ch = {
    ...emptyCharacter('x'),
    attributes: { Tělo: 8, Duše: 4, Vliv: 6 },
    scars: [
      { id: 'a', attribute: 'Tělo' as const, severity: 3, note: 'ruka' },
      { id: 'b', attribute: 'Duše' as const, severity: 1, note: 'strach' },
    ],
  }
  const none = { Tělo: 0, Duše: 0, Vliv: 0 }

  it('cena je 5 Zdrojů za stupeň a nejvíc se zmírní na závažnost 1', () => {
    expect(maxSteps(3)).toBe(2)
    expect(maxSteps(1)).toBe(0)
    expect(healCost(2)).toBe(10)
    const r = checkHeal(ch, none, 'b', { steps: 1, potion: 0, pay: none })
    expect(r.error).toMatch(/zahojit/)
    expect(checkHeal(ch, none, 'a', { steps: 3, potion: 0, pay: none }).error).toMatch(/1 až 2/)
    expect(checkHeal(ch, none, 'a', { steps: 0, potion: 0, pay: none }).error).toMatch(/1 až 2/)
  })

  it('výchozí platba bere nejdřív Zdroje vlastnosti Jizvy, doplatek z té, které zbývá víc', () => {
    // Tělo 5 po Jizvě; 2 stupně = 10: Tělo 5, pak Vliv (6) před Duší (3)
    expect(autoPay(ch, none, 'a', 10)).toEqual({ Tělo: 5, Duše: 0, Vliv: 5 })
    expect(autoPay(ch, none, 'a', 3)).toEqual({ Tělo: 3, Duše: 0, Vliv: 0 })
  })

  it('platba se musí rovnat ceně po odečtu lektvaru a nepřekročit Zdroje', () => {
    const ok = checkHeal(ch, none, 'a', { steps: 1, potion: 2, pay: { Tělo: 3, Duše: 0, Vliv: 0 } })
    expect(ok.error).toBe('')
    expect(ok.own).toBe(3)
    expect(checkHeal(ch, none, 'a', { steps: 1, potion: 0, pay: { Tělo: 3, Duše: 0, Vliv: 0 } }).error).toMatch(/Zbývá rozdělit 2/)
    expect(checkHeal(ch, none, 'a', { steps: 1, potion: 4, pay: { Tělo: 3, Duše: 0, Vliv: 0 } }).error).toMatch(/o 2 Zdrojů víc/)
    // lektvar nejvýš cena
    expect(checkHeal(ch, none, 'a', { steps: 1, potion: 99, pay: none }).own).toBe(0)
    // vlastnost nemá dost
    const tired = { Tělo: 4, Duše: 0, Vliv: 0 }
    expect(checkHeal(ch, tired, 'a', { steps: 1, potion: 0, pay: { Tělo: 5, Duše: 0, Vliv: 0 } }).error).toMatch(/Tělo/)
  })

  it('provedení sníží závažnost, změní popis a zvýší čerpání', () => {
    const input = { steps: 2, potion: 5, pay: { Tělo: 5, Duše: 0, Vliv: 0 }, note: ' hojící se strup ' }
    const r = applyHeal(ch, none, 'a', input)
    expect(r.character.scars.find((s) => s.id === 'a')).toEqual({ id: 'a', attribute: 'Tělo', severity: 1, note: 'hojící se strup' })
    expect(r.character.scars.find((s) => s.id === 'b')?.severity).toBe(1)
    expect(r.spent).toEqual({ Tělo: 5, Duše: 0, Vliv: 0 })
    // bez popisu zůstane původní
    expect(applyHeal(ch, none, 'a', { ...input, note: undefined }).character.scars[0].note).toBe('ruka')
  })

  it('neplatný vstup nic nezmění', () => {
    const r = applyHeal(ch, none, 'a', { steps: 1, potion: 0, pay: none })
    expect(r.character).toBe(ch)
    expect(r.spent).toBe(none)
  })
})
