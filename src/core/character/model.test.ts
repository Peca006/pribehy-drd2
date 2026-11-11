import { describe, expect, it } from 'vitest'
import { applyChange, characterOf, emptyCharacter, eventsFor } from './model'

describe('deník změn', () => {
  it('stav postavy vznikne z posloupnosti změn', () => {
    const before = emptyCharacter('a')
    const after = {
      ...before,
      name: 'Jarik',
      attributes: { Tělo: 6, Duše: 6, Vliv: 3 },
      professions: { 'povolani:lovec': 2 },
    }
    const events = eventsFor(before, after, 'Petr', 'Tvorba postavy')
    expect(events.map((e) => e.path).sort()).toEqual(
      [
        'attributes.Duše',
        'attributes.Tělo',
        'attributes.Vliv',
        'name',
        'professions.povolani:lovec',
      ].sort(),
    )
    expect(characterOf({ id: 'a', events })).toEqual(after)
  })

  it('smazání položky v mapě a původní objekt zůstává nedotčen', () => {
    const c = { ...emptyCharacter('a'), professions: { x: 1, y: 2 } }
    const n = applyChange(c, { id: '1', at: '', by: '', path: 'professions.x', value: undefined })
    expect(n.professions).toEqual({ y: 2 })
    expect(c.professions).toEqual({ x: 1, y: 2 })
  })

  it('změna jen jedné hodnoty vyrobí jedinou událost', () => {
    const a = emptyCharacter('a')
    const b = { ...a, attributes: { ...a.attributes, Vliv: 4 } }
    expect(eventsFor(a, b, 'x', 'y')).toHaveLength(1)
  })
})
