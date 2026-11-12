import { describe, expect, it } from 'vitest'
import type { Ability, CreationRules, Profession, Race } from '../content/schema'
import {
  advanceByAttribute,
  advanceByLevel,
  attributePool,
  describeAdvance,
  forgettable,
  levelProblems,
  XP_PER_ADVANCEMENT,
} from './advance'
import { checkCharacter, type CheckContext } from './check'
import { emptyCharacter, type Character } from './model'

const ab = (id: string): Ability => ({ id, name: id.split('/').pop()!, text: '' })
const prof = (id: string, kind: Profession['kind'], requires?: string[]): Profession => ({
  id,
  name: id.split(':')[1],
  kind,
  ...(requires ? { requires } : {}),
  intro: '',
  skills: [],
  abilities: Array.from({ length: 6 }, (_, i) => ab(`${id}/s${i + 1}`)),
})
const rules: CreationRules = {
  startingLevels: 3,
  attributePoints: 15,
  attributeMin: 1,
  attributeRecommendedMin: 3,
  raceAbilities: 1,
  abilitiesPerLevel: 1,
  purchaseBudget: 900,
}
const race: Race = {
  id: 'rasa:lide',
  name: 'Lidé',
  text: '',
  names: [],
  cultures: [],
  abilities: [ab('rasa:lide/a'), ab('rasa:lide/b')],
}
const ctx: CheckContext = {
  rules,
  professions: [
    prof('p:bojovnik', 'zakladni'),
    prof('p:lovec', 'zakladni'),
    prof('p:hranicar', 'pokrocile', ['p:bojovnik', 'p:lovec']),
  ],
  races: [race],
  commonAbilities: [ab('schopnost:rasa/rodova-zbran')],
}
const hero: Character = {
  ...emptyCharacter('x'),
  name: 'Ríša',
  raceId: 'rasa:lide',
  attributes: { Tělo: 6, Duše: 5, Vliv: 4 },
  professions: { 'p:lovec': 2, 'p:bojovnik': 1 },
  abilities: ['rasa:lide/a', 'p:lovec/s1', 'p:lovec/s2', 'p:bojovnik/s1'],
  xp: 12,
}
const problems = (c: Character) => checkCharacter(c, ctx).map((x) => x.text)

describe('postup úrovní (A)', () => {
  it('úroveň + schopnost povolání, odečte 12 bodů a výsledek projde kontrolou', () => {
    const r = advanceByLevel(hero, ctx, 'p:lovec', 'p:lovec/s3')
    expect(r.problems).toEqual([])
    expect(r.warnings).toEqual([])
    expect(r.character.professions['p:lovec']).toBe(3)
    expect(r.character.abilities).toContain('p:lovec/s3')
    expect(r.character.xp).toBe(0)
    expect(problems(r.character)).toEqual([])
    expect(hero.professions['p:lovec']).toBe(2) // původní postava se nemění
  })

  it('nejvyšší úroveň je 5 a schopnost musí být z povolání a ještě nezískaná', () => {
    const lvl5 = { ...hero, professions: { 'p:lovec': 5, 'p:bojovnik': 1 } }
    expect(advanceByLevel(lvl5, ctx, 'p:lovec', 'p:lovec/s6').problems.join()).toMatch(
      /nejvyšší úroveň/,
    )
    expect(advanceByLevel(hero, ctx, 'p:lovec', 'p:bojovnik/s2').problems.join()).toMatch(
      /není ze seznamu/,
    )
    expect(advanceByLevel(hero, ctx, 'p:lovec', 'p:lovec/s1').problems.join()).toMatch(/už má/)
    expect(advanceByLevel(hero, ctx, 'p:neexistuje', 'x').problems.join()).toMatch(
      /Neznámé povolání/,
    )
  })

  it('málo zkušeností jen varuje', () => {
    const r = advanceByLevel({ ...hero, xp: 4 }, ctx, 'p:lovec', 'p:lovec/s3')
    expect(r.problems).toEqual([])
    expect(r.warnings.join()).toMatch(/potřeba 12/)
    expect(r.character.xp).toBe(4 - XP_PER_ADVANCEMENT)
  })

  it('pokročilé povolání vyžaduje 6 úrovní ve dvou základních (po jedné z každého)', () => {
    expect(levelProblems(hero, ctx, 'p:hranicar').join()).toMatch(/alespoň 6 úrovní/)
    const ready = {
      ...hero,
      professions: { 'p:lovec': 4, 'p:bojovnik': 2 },
      abilities: [...hero.abilities, 'p:lovec/s3', 'p:lovec/s4', 'p:bojovnik/s2'],
    }
    expect(levelProblems(ready, ctx, 'p:hranicar')).toEqual([])
    const onlyOne = { ...hero, professions: { 'p:lovec': 6 } }
    expect(levelProblems(onlyOne, ctx, 'p:hranicar').join()).toMatch(/po jedné z každého/)
    // další úroveň už stejného pokročilého povolání požadavek znovu nekontroluje
    expect(
      levelProblems(
        { ...ready, professions: { ...ready.professions, 'p:hranicar': 1 } },
        ctx,
        'p:hranicar',
      ),
    ).toEqual([])
  })

  it('zapomínání: nahradí schopnost téhož povolání jinou', () => {
    const r = advanceByLevel(hero, ctx, 'p:lovec', 'p:lovec/s3', 'p:lovec/s1')
    expect(r.problems).toEqual([])
    expect(r.character.abilities).not.toContain('p:lovec/s1')
    expect(r.character.abilities).toContain('p:lovec/s3')
    expect(
      advanceByLevel(hero, ctx, 'p:lovec', 'p:lovec/s3', 'p:bojovnik/s1').problems.join(),
    ).toMatch(/Zapomenout/)
    expect(forgettable(hero, ctx, 'p:lovec').map((a) => a.id)).toEqual(['p:lovec/s1', 'p:lovec/s2'])
  })
})

describe('zlepšení zdatnosti (B)', () => {
  it('zdatnost o 1 a schopnost rasy nebo ovládaného povolání; kontrola pravidel projde', () => {
    const r = advanceByAttribute(hero, ctx, 'Vliv', 'rasa:lide/b')
    expect(r.problems).toEqual([])
    expect(r.character.attributes.Vliv).toBe(5)
    expect(r.character.xp).toBe(0)
    expect(problems(r.character)).toEqual([])
    const r2 = advanceByAttribute(hero, ctx, 'Tělo', 'p:bojovnik/s2')
    expect(r2.problems).toEqual([])
    expect(problems(r2.character)).toEqual([])
  })

  it('schopnost z povolání, které postava nemá, nejde', () => {
    expect(attributePool(hero, ctx).some((a) => a.id.startsWith('p:hranicar'))).toBe(false)
    expect(advanceByAttribute(hero, ctx, 'Tělo', 'p:hranicar/s1').problems.join()).toMatch(/ovládá/)
  })

  it('kontrola pravidel: schopnost navíc bez zlepšení zdatnosti je chyba, se zlepšením ne', () => {
    const extra = { ...hero, abilities: [...hero.abilities, 'rasa:lide/b'] }
    expect(problems(extra).join()).toMatch(/Schopností je celkem 5, pravidla dovolují 4/)
    expect(problems({ ...extra, attributes: { Tělo: 6, Duše: 5, Vliv: 5 } })).toEqual([])
  })

  it('popis zlepšení do poznámky', () => {
    const a = advanceByLevel(hero, ctx, 'p:lovec', 'p:lovec/s3')
    expect(describeAdvance(ctx, hero, a.character, 'p:lovec/s3')).toBe(
      'Postup: lovec 3, schopnost s3',
    )
    const b = advanceByAttribute(hero, ctx, 'Vliv', 'rasa:lide/b')
    expect(describeAdvance(ctx, hero, b.character, 'rasa:lide/b')).toBe(
      'Postup: Vliv 5, schopnost b',
    )
  })
})

describe('kontrola: pokročilé povolání, zkušenosti a jizvy', () => {
  it('upozorní na pokročilé povolání bez požadavků a na špatné jizvy a zkušenosti', () => {
    expect(
      problems({
        ...hero,
        professions: { ...hero.professions, 'p:hranicar': 1 },
        abilities: [...hero.abilities, 'p:hranicar/s1'],
      }).join(),
    ).toMatch(/pokročilé povolání vyžaduje/)
    expect(problems({ ...hero, xp: -3 }).join()).toMatch(/zkušeností/)
    expect(
      problems({ ...hero, scars: [{ id: 'j', attribute: 'Tělo', severity: 9, note: 'x' }] }).join(),
    ).toMatch(/závažnost 9/)
    expect(
      problems({ ...hero, scars: [{ id: 'j', attribute: 'Tělo', severity: 2, note: 'x' }] }),
    ).toEqual([])
  })
})
