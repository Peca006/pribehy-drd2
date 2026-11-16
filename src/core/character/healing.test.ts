import { describe, expect, it } from 'vitest'
import { emptyCharacter } from './model'
import { applyHeal, easeScar, healScar, inflictScar, planHeal } from './healing'

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

describe('léčení v magickém okamžiku', () => {
  // Tělo 8 s Jizvou 3 (zbývá 5), Duše 4, Vliv 6
  const ch = {
    ...emptyCharacter('x'),
    attributes: { Tělo: 8, Duše: 4, Vliv: 6 },
    scars: [
      { id: 'a', attribute: 'Tělo' as const, severity: 3, note: 'ruka' },
      { id: 'b', attribute: 'Duše' as const, severity: 1, note: 'strach' },
    ],
  }
  const none = { Tělo: 0, Duše: 0, Vliv: 0 }
  const plan = (r: ReturnType<typeof planHeal>) => {
    if ('error' in r) throw new Error(r.error)
    return r.plan
  }

  it('cena je 5 Zdrojů za stupeň, nejdřív ze Zdrojů vlastnosti Jizvy', () => {
    const p = plan(planHeal(ch, none, 'b', { strength: 3, steps: 1, potion: 0 }))
    expect(p.cost).toBe(5)
    expect(p.pay).toEqual({ Tělo: 0, Duše: 3, Vliv: 2 })
    expect(p.after).toBe(0)
  })

  it('doplatek jde z vlastnosti, které zbývá víc', () => {
    // Tělo Jizva 3 => zbývá 5; léčím 2 stupně = 10: Tělo 5, pak Vliv (6 - 0) před Duše (3 po Jizvě)
    const p = plan(planHeal(ch, none, 'a', { strength: 3, steps: 2, potion: 0 }))
    expect(p.pay).toEqual({ Tělo: 5, Duše: 0, Vliv: 5 })
    expect(p.after).toBe(1)
  })

  it('lektvar snižuje platbu, nejvýš na nulu', () => {
    expect(plan(planHeal(ch, none, 'a', { strength: 3, steps: 1, potion: 2 })).own).toBe(3)
    expect(plan(planHeal(ch, none, 'a', { strength: 3, steps: 1, potion: 99 })).own).toBe(0)
  })

  it('slabý magický okamžik Jizvu neléčí a mezní hodnoty se hlídají', () => {
    expect('error' in planHeal(ch, none, 'a', { strength: 2, steps: 1, potion: 0 })).toBe(true)
    expect('error' in planHeal(ch, none, 'a', { strength: 3, steps: 0, potion: 0 })).toBe(true)
    expect('error' in planHeal(ch, none, 'a', { strength: 3, steps: 4, potion: 0 })).toBe(true)
    expect('error' in planHeal(ch, none, 'zzz', { strength: 3, steps: 1, potion: 0 })).toBe(true)
  })

  it('nestačí-li vlastní Zdroje, léčení se nepovolí a lektvar to zachrání', () => {
    const tired = { Tělo: 5, Duše: 3, Vliv: 6 }
    const r = planHeal(ch, tired, 'a', { strength: 3, steps: 3, potion: 0 })
    expect('error' in r && r.error).toMatch(/chybí/)
    expect('error' in planHeal(ch, tired, 'a', { strength: 3, steps: 3, potion: 15 })).toBe(false)
  })

  it('provedení sníží závažnost a zvýší čerpání', () => {
    const p = plan(planHeal(ch, none, 'a', { strength: 3, steps: 3, potion: 5 }))
    const r = applyHeal(ch, none, 'a', p)
    expect(r.character.scars.map((s) => s.id)).toEqual(['b'])
    expect(r.spent.Tělo + r.spent.Duše + r.spent.Vliv).toBe(10)
    const half = applyHeal(ch, none, 'a', plan(planHeal(ch, none, 'a', { strength: 3, steps: 2, potion: 0 })))
    expect(half.character.scars.find((s) => s.id === 'a')?.severity).toBe(1)
  })
})
