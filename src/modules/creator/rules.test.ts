import { describe, expect, it } from 'vitest'
import type { CreationRules, Profession, Race } from '../../core/content/schema'
import { formatMoney, problems, quickAbilities, quickRaceAbility } from './rules'

const rules: CreationRules = {
  startingLevels: 3,
  attributePoints: 15,
  attributeMin: 1,
  attributeRecommendedMin: 3,
  raceAbilities: 1,
  abilitiesPerLevel: 1,
  purchaseBudget: 900,
}
const ab = (id: string, q?: number) => ({ id, name: id, text: 't', quickPickLevel: q })
const prof = (id: string): Profession => ({
  id,
  name: id,
  kind: 'zakladni',
  intro: '',
  skills: [],
  abilities: [ab(id + '/a', 2), ab(id + '/b', 1), ab(id + '/c'), ab(id + '/d', 3)],
})

describe('pravidla tvorby', () => {
  it('rychlá volba povolání dává schopnosti do dané úrovně podle pořadí', () => {
    expect(quickAbilities(prof('p'), 2).map((a) => a.id)).toEqual(['p/b', 'p/a'])
    expect(quickAbilities(prof('p'), 0)).toEqual([])
  })

  it('rychlá volba rasy podle kultury', () => {
    const race = {
      abilities: [{ ...ab('r/x'), quickPickCulture: 'Horda' }, ab('r/y')],
    } as unknown as Race
    expect(quickRaceAbility(race, 'Horda')?.id).toBe('r/x')
    expect(quickRaceAbility(race, undefined)).toBeUndefined()
  })

  it('hlásí, co chybí, a hotová postava je bez problémů', () => {
    const ps = [prof('a'), prof('b')]
    const bad = problems(rules, ps, {
      levels: { a: 2 },
      attributes: { Tělo: 5, Duše: 5, Vliv: 2 },
      raceAbility: '',
      abilities: ['a/a'],
    })
    expect(bad.map((p) => p.step).sort()).toEqual([
      'povolani',
      'rasa',
      'schopnosti',
      'schopnosti',
      'zdatnost',
    ])

    const ok = problems(rules, ps, {
      raceId: 'r',
      levels: { a: 2, b: 1 },
      attributes: { Tělo: 6, Duše: 6, Vliv: 3 },
      raceAbility: 'r/x',
      abilities: ['a/a', 'a/b', 'b/c'],
    })
    expect(ok).toEqual([])
  })

  it('formátuje peníze', () => {
    expect(formatMoney(600)).toBe('6 dukátů')
    expect(formatMoney(240)).toBe('2 dukáty 4 groše')
    expect(formatMoney(5)).toBe('5 haléřů')
    expect(formatMoney(0)).toBe('0 grošů')
  })
})
