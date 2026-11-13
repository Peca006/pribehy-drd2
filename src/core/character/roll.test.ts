import { describe, expect, it } from 'vitest'
import { emptyCharacter } from './model'
import { clash, evaluateRoll, levelOf, rollDice, rollDie } from './roll'

const c = { ...emptyCharacter('x'), professions: { bojovnik: 3, lovec: 1, mag: 2 } }

describe('hod kostkami', () => {
  it('kostka dává 1 až 6 a krajní hodnoty rng sedí', () => {
    expect(rollDie(() => 0)).toBe(1)
    expect(rollDie(() => 0.9999)).toBe(6)
    expect(rollDice(() => 0.5)).toEqual([4, 4])
  })
  it('úroveň je nejnižší z vybraných povolání, bez povolání 0', () => {
    expect(levelOf(c, [])).toBe(0)
    expect(levelOf(c, ['bojovnik'])).toBe(3)
    expect(levelOf(c, ['bojovnik', 'mag'])).toBe(2)
    expect(levelOf(c, ['bojovnik', 'lovec', 'mag'])).toBe(1)
    expect(levelOf(c, ['bojovnik', 'neznamy'])).toBe(0)
  })
  it('hod 9 a více je úspěch', () => {
    expect(evaluateRoll([4, 4], 0)).toEqual({ sum: 8, total: 8, success: false })
    expect(evaluateRoll([4, 4], 1)).toEqual({ sum: 8, total: 9, success: true })
    expect(evaluateRoll([6, 6], 0).success).toBe(true)
    expect(evaluateRoll([1, 1], 5).success).toBe(false)
  })
})

describe('střet', () => {
  const r = (d: [number, number], lvl = 0) => ({ dice: d, total: d[0] + d[1] + lvl })
  it('vyšší hod vítězí', () => {
    expect(clash(r([3, 4]), r([2, 2]))).toEqual({ winner: 'a', reason: 'hod' })
    expect(clash(r([1, 1], 1), r([6, 6]), 'a').winner).toBe('b')
  })
  it('shoda: aktér, jinak vyšší kostka, součet kostek, nakonec los', () => {
    expect(clash(r([3, 4]), r([2, 5]), 'b')).toEqual({ winner: 'b', reason: 'aktér' })
    expect(clash(r([2, 5]), r([3, 4]))).toEqual({ winner: 'a', reason: 'kostka' })
    expect(clash(r([3, 4], 1), r([4, 3], 1))).toEqual({ winner: 'los', reason: 'los' })
    expect(clash(r([4, 4], 0), r([5, 2], 1))).toEqual({ winner: 'b', reason: 'kostka' })
    expect(clash(r([4, 4], 0), r([4, 3], 1))).toEqual({ winner: 'a', reason: 'součet' })
  })
})
