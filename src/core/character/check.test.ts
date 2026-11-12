import { describe, expect, it } from 'vitest'
import type { Ability, CreationRules, Profession, Race } from '../content/schema'
import { checkCharacter, type CheckContext } from './check'
import { emptyCharacter, type Character } from './model'

const ab = (id: string): Ability => ({ id, name: id, text: '' })
const rules: CreationRules = {
  startingLevels: 3,
  attributePoints: 15,
  attributeMin: 1,
  attributeRecommendedMin: 3,
  raceAbilities: 1,
  abilitiesPerLevel: 1,
  purchaseBudget: 900,
}
const prof = (id: string, n: number): Profession => ({
  id,
  name: id,
  kind: 'zakladni',
  intro: '',
  skills: [],
  abilities: Array.from({ length: n }, (_, i) => ab(`${id}/s${i + 1}`)),
})
const race: Race = {
  id: 'rasa:lide',
  name: 'Lidé',
  text: '',
  names: [],
  cultures: [{ id: 'kultura:lide/k1', name: 'K1', text: '' }],
  abilities: [ab('rasa:lide/a'), ab('rasa:lide/b')],
}
const ctx: CheckContext = {
  rules,
  professions: [prof('p:lovec', 6), prof('p:bojovnik', 6)],
  races: [race],
  commonAbilities: [ab('schopnost:rasa/rodova-zbran')],
}
const ok: Character = {
  ...emptyCharacter('x'),
  name: 'Ríša',
  raceId: 'rasa:lide',
  cultureId: 'kultura:lide/k1',
  attributes: { Tělo: 6, Duše: 5, Vliv: 4 },
  professions: { 'p:lovec': 2, 'p:bojovnik': 1 },
  abilities: ['rasa:lide/a', 'p:lovec/s1', 'p:lovec/s2', 'p:bojovnik/s1'],
  cash: 100,
}
const texts = (c: Character) => checkCharacter(c, ctx).map((x) => x.text)
const joined = (c: Character) => texts(c).join('|')

describe('checkCharacter', () => {
  it('správně vytvořená postava nemá žádné upozornění', () => {
    expect(texts(ok)).toEqual([])
  })

  it('počet schopností povolání se kontroluje v obou směrech', () => {
    expect(joined({ ...ok, abilities: [...ok.abilities, 'p:lovec/s3'] })).toMatch(
      /p:lovec: 3 schopností, úroveň 2 jich dovoluje 2/,
    )
    expect(joined({ ...ok, abilities: ok.abilities.filter((a) => a !== 'p:lovec/s2') })).toMatch(
      /p:lovec: 1 schopností, úroveň 2 jich má 2/,
    )
    expect(
      joined({ ...ok, abilities: ok.abilities.filter((a) => !a.startsWith('p:bojovnik')) }),
    ).toMatch(/p:bojovnik: žádná schopnost/)
  })

  it('zachytí překlepy: neznámé ID, duplicity, cizí povolání', () => {
    const t = joined({ ...ok, abilities: [...ok.abilities, 'p:lovec/s2', 'p:lovek/s9'] })
    expect(t).toMatch(/„p:lovec\/s2“ je uvedena víckrát/)
    expect(t).toMatch(/Neznámá schopnost „p:lovek\/s9“/)
    expect(joined({ ...ok, professions: { ...ok.professions, 'p:lovek': 1 } })).toMatch(
      /Neznámé povolání „p:lovek“/,
    )
    expect(joined({ ...ok, professions: { 'p:lovec': 2 } })).toMatch(
      /povolání p:bojovnik, které postava nemá/,
    )
  })

  it('rasa, kultura, rasové schopnosti a Rodová zbraň', () => {
    expect(joined({ ...ok, raceId: 'rasa:elfove' })).toMatch(/Neznámá rasa/)
    expect(joined({ ...ok, cultureId: 'kultura:jina' })).toMatch(/nepatří k rase/)
    expect(joined({ ...ok, abilities: [...ok.abilities, 'rasa:lide/b'] })).toMatch(
      /Rasových schopností je 2/,
    )
    expect(joined({ ...ok, abilities: ok.abilities.filter((a) => a !== 'rasa:lide/a') })).toMatch(
      /Chybí rasová schopnost/,
    )
    const rz = { ...ok, abilities: ['schopnost:rasa/rodova-zbran', ...ok.abilities.slice(1)] }
    expect(joined(rz)).toMatch(/chybí druh zbraně/)
    expect(texts({ ...rz, weaponKind: 'meče' })).toEqual([])
  })

  it('úroveň, zdatnost, hotovost, výbava a jméno', () => {
    expect(joined({ ...ok, professions: { ...ok.professions, 'p:lovec': 6 } })).toMatch(
      /mimo rozsah/,
    )
    expect(joined({ ...ok, attributes: { Tělo: 0, Duše: 5, Vliv: 4 } })).toMatch(/alespoň 1/)
    expect(joined({ ...ok, attributes: { Tělo: 5.5, Duše: 5, Vliv: 4 } })).toMatch(
      /není celé číslo/,
    )
    expect(joined({ ...ok, cash: -5 })).toMatch(/Hotovost/)
    expect(joined({ ...ok, equipment: ['Meč', 'meč ', ''] })).toMatch(/opakuje: meč/)
    expect(texts({ ...ok, name: '' })).toEqual(['Postava nemá jméno.'])
  })
})
