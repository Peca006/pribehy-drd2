import { beforeEach, describe, expect, it } from 'vitest'
import type { Creature } from '../content/schema'
import {
  addToConflict,
  clampThreat,
  emptyConflict,
  fromCreature,
  hero,
  loadConflict,
  nextRound,
  ordered,
  overLimit,
  saveConflict,
  summary,
  update,
} from './conflict'

const store = new Map<string, string>()
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
} as Storage
beforeEach(() => store.clear())

const creature = {
  id: 'b:vlk',
  name: 'Vlk',
  kind: 'zvirata',
  characteristic: { min: 2, max: 4 },
  fate: 6,
  limits: { Tělo: 3 },
  stats: [],
  description: '',
  sections: [],
} as Creature

describe('konflikt', () => {
  it('Ohrožení nejde pod 1 ani nad strop', () => {
    expect(clampThreat(0)).toBe(1)
    expect(clampThreat(3)).toBe(3)
    expect(clampThreat(99)).toBe(20)
  })

  it('bytost přebírá charakteristiku, Sudbu a hranice z karty', () => {
    const p = fromCreature(creature)
    expect(p).toMatchObject({ kind: 'bytost', level: 4, fate: 6, fateMax: 6, limits: { Tělo: 3 } })
  })

  it('součet Jizev nad hranicí vyřazuje, rovnost ještě ne', () => {
    let p = fromCreature(creature)
    p = { ...p, scars: { ...p.scars, Tělo: 3 } }
    expect(overLimit(p)).toEqual([])
    p = { ...p, scars: { ...p.scars, Tělo: 4 } }
    expect(overLimit(p)).toEqual(['Tělo'])
  })

  it('pořadí podle iniciativy, vyřazení na konci, shoda podle přidání', () => {
    const a = { ...hero('A'), initiative: 5 }
    const b = { ...hero('B'), initiative: 9 }
    const c = { ...hero('C'), initiative: 9 }
    const d = { ...hero('D'), initiative: 12, out: true }
    const order = ordered({ round: 1, participants: [a, b, c, d] }).map((p) => p.name)
    expect(order).toEqual(['B', 'C', 'A', 'D'])
  })

  it('další kolo zvýší číslo a zruší „jednal“', () => {
    const a = { ...hero('A'), acted: true }
    const c = nextRound({ round: 2, participants: [a] })
    expect(c.round).toBe(3)
    expect(c.participants[0].acted).toBe(false)
  })

  it('změna jednoho účastníka a shrnutí', () => {
    const a = hero('A')
    const b = hero('B')
    let c = { ...emptyConflict(), participants: [a, b] }
    c = update(c, b.id, { out: true })
    expect(summary({ ...c, round: 3 })).toBe(
      'Konflikt trval 3 kola. Účastníci: A, B. Vyřazeni: B. Zůstali: A.',
    )
  })

  it('ukládá se u družiny a prázdný konflikt se smaže', () => {
    expect(loadConflict('p').participants).toEqual([])
    addToConflict('p', hero('A'))
    addToConflict('p', fromCreature(creature))
    expect(loadConflict('p').participants.map((x) => x.name)).toEqual(['A', 'Vlk'])
    saveConflict('p', emptyConflict())
    expect(store.has('drd2-conflict:p')).toBe(false)
  })
})
