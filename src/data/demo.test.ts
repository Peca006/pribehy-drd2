import { describe, expect, it } from 'vitest'
import { characterOf } from '../core/character/model'
import { problems } from '../modules/creator/rules'
import skeleton from './skeleton.json'
import { DEMO_CHARACTERS, demoLog, demoParty } from './demo'

type Sk = typeof skeleton
const sk = skeleton as unknown as Sk & {
  professions: { id: string; abilities: { id: string }[] }[]
  races: { id: string; cultures: { id: string }[]; abilities: { id: string }[] }[]
}

describe('ukázková data', () => {
  it('postavy odpovídají pravidlům tvorby a známým ID', () => {
    const rules = skeleton.creation as never
    for (const c of DEMO_CHARACTERS) {
      const race = sk.races.find((r) => r.id === c.raceId)!
      expect(race, c.name).toBeTruthy()
      expect(race.cultures.map((x) => x.id)).toContain(c.cultureId)
      const raceAbility = c.abilities.find((a) => race.abilities.some((x) => x.id === a))!
      expect(raceAbility, c.name).toBeTruthy()
      const profIds = Object.keys(c.professions)
      const profs = sk.professions.filter((p) => profIds.includes(p.id))
      expect(profs).toHaveLength(profIds.length)
      const rest = c.abilities.filter((a) => a !== raceAbility)
      for (const a of rest) expect(profs.some((p) => p.abilities.some((x) => x.id === a))).toBe(true)
      expect(skeleton.traits.map((t) => t.id)).toContain(c.trait)
      const issues = problems(rules, profs as never, {
        raceId: c.raceId,
        levels: c.professions,
        attributes: c.attributes,
        raceAbility,
        abilities: rest,
      })
      expect(issues, c.name).toEqual([])
    }
  })

  it('deník dá zpět stejnou postavu a družina odkazuje na postavy', () => {
    for (const c of DEMO_CHARACTERS) expect(characterOf(demoLog(c, 'Test'))).toEqual(c)
    const p = demoParty()
    expect(p.members.map((m) => m.characterId)).toEqual(DEMO_CHARACTERS.map((c) => c.id))
  })
})
