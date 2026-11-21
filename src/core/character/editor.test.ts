import { describe, expect, it } from 'vitest'
import type { Ability, Profession, Race } from '../content/schema'
import { emptyCharacter } from './model'
import {
  abilityGroups,
  effectiveAttributes,
  orphanAbilities,
  toggleAbility,
  withItem,
  withNewScar,
  withProfessionLevel,
} from './editor'

const ab = (id: string) => ({ id, name: id }) as unknown as Ability
const race = { id: 'r', name: 'Elf', abilities: [ab('r1')] } as unknown as Race
const prof = (id: string) => ({ id, name: id, abilities: [ab(`${id}1`)] }) as unknown as Profession

describe('úprava postavy', () => {
  it('dovednosti: nabídky podle rasy a povolání, přebytečné jsou osiřelé', () => {
    const c = { ...emptyCharacter('c'), professions: { a: 1, b: 0 }, abilities: ['r1', 'a1', 'zmizela'] }
    const g = abilityGroups(c, race, [ab('spol')], [prof('a'), prof('b')])
    expect(g.map((x) => x.title)).toEqual(['Rasa: Elf', 'a'])
    expect(g[0].abilities.map((x) => x.id)).toEqual(['r1', 'spol'])
    expect(orphanAbilities(c, g)).toEqual(['zmizela'])
  })

  it('přepíná dovednost beze změny původní postavy', () => {
    const c = emptyCharacter('c')
    const on = toggleAbility(c, 'x')
    expect(on.abilities).toEqual(['x'])
    expect(c.abilities).toEqual([])
    expect(toggleAbility(on, 'x').abilities).toEqual([])
  })

  it('úroveň povolání: nula odebere, nejvýše 5', () => {
    let c = withProfessionLevel(emptyCharacter('c'), 'a', 3)
    expect(c.professions.a).toBe(3)
    c = withProfessionLevel(c, 'a', 9)
    expect(c.professions.a).toBe(5)
    expect('a' in withProfessionLevel(c, 'a', 0).professions).toBe(false)
  })

  it('Jizvy snižují zdatnost nejméně na nulu', () => {
    const base = emptyCharacter('c')
    let c = { ...base, attributes: { ...base.attributes, Tělo: 2 } }
    c = withNewScar(withNewScar(withNewScar(c)))
    expect(c.scars).toHaveLength(3)
    expect(effectiveAttributes(c).Tělo).toBe(0)
    expect(effectiveAttributes(c).Duše).toBe(base.attributes.Duše)
  })

  it('výbava: prázdná položka nic nepřidá', () => {
    const c = emptyCharacter('c')
    expect(withItem(c, ' ')).toBe(c)
    expect(withItem(c, ' lano ').equipment).toEqual(['lano'])
  })
})
