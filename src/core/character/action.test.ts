import { describe, expect, it } from 'vitest'
import { actionMode, evaluateAction, type ActionInput } from './action'

const base: ActionInput = {
  kind: 'zkouska',
  dice: [0, 0],
  extra: 0,
  inaccurate: false,
  level: 0,
  oppDice: [0, 0],
  oppLevel: 0,
  actor: 'me',
}
const run = (o: Partial<ActionInput>) => evaluateAction({ ...base, ...o })

describe('režim hodu', () => {
  it('Přesně = tři kostky a dvě nejvyšší, postih Nepřesně = dvě nejnižší, jinak běžný hod', () => {
    expect(actionMode('presne', false)).toBe('best')
    expect(actionMode(undefined, true)).toBe('worst')
    expect(actionMode('mocne', false)).toBe('normal')
    expect(actionMode(undefined, false)).toBe('normal')
  })
})

describe('zkouška a výzva', () => {
  it('bez hozených kostek není výsledek', () => {
    const s = run({})
    expect(s.rolled).toBe(false)
    expect(s.result).toBeUndefined()
    expect(s.done).toBe(false)
    expect(s.won).toBe(false)
  })

  it('úspěch od 9 včetně úrovně povolání', () => {
    expect(run({ dice: [4, 4], level: 0 })).toMatchObject({ rolled: true, done: true, won: false })
    expect(run({ dice: [4, 4], level: 1 })).toMatchObject({ done: true, won: true })
    expect(run({ dice: [6, 3] }).result?.total).toBe(9)
  })

  it('Přesně: potřebuje třetí kostku a počítá dvě nejvyšší', () => {
    const wait = run({ dice: [2, 3], man: 'presne' })
    expect(wait.three).toBe(true)
    expect(wait.rolled).toBe(false)
    const s = run({ dice: [2, 3], extra: 6, man: 'presne' })
    expect(s.rolled).toBe(true)
    expect(s.pair).toEqual([6, 3])
    expect(s.result?.total).toBe(9)
  })

  it('postih Nepřesně počítá dvě nejnižší ze tří', () => {
    const s = run({ dice: [6, 5], extra: 1, inaccurate: true })
    expect(s.mode).toBe('worst')
    expect(s.pair).toEqual([1, 5])
    expect(s.result?.total).toBe(6)
    expect(s.won).toBe(false)
  })
})

describe('střet', () => {
  const stret = (o: Partial<ActionInput>) => run({ kind: 'stret', ...o })

  it('čeká na obě strany', () => {
    expect(stret({ dice: [3, 3] }).done).toBe(false)
    expect(stret({ oppDice: [3, 3] }).done).toBe(false)
  })

  it('vyšší hod vítězí', () => {
    const win = stret({ dice: [6, 5], oppDice: [2, 3] })
    expect(win).toMatchObject({ done: true, won: true })
    expect(win.clashRes).toMatchObject({ winner: 'a', reason: 'hod' })
    expect(stret({ dice: [1, 2], oppDice: [6, 6] }).won).toBe(false)
  })

  it('při shodě vítězí aktér', () => {
    expect(stret({ dice: [4, 3], oppDice: [4, 3], actor: 'me' }).won).toBe(true)
    expect(stret({ dice: [4, 3], oppDice: [4, 3], actor: 'opp' }).won).toBe(false)
  })

  it('bez zřejmého aktéra rozhoduje vyšší kostka, pak součet', () => {
    const k = stret({ dice: [6, 1], oppDice: [4, 3], actor: 'unclear' })
    expect(k.clashRes).toMatchObject({ winner: 'a', reason: 'kostka' })
    expect(k.won).toBe(true)
  })

  it('úplná shoda čeká na los a rozhodne se až po něm', () => {
    const open = stret({ dice: [4, 3], oppDice: [3, 4], actor: 'unclear' })
    expect(open.clashRes?.winner).toBe('los')
    expect(open.done).toBe(false)
    expect(stret({ dice: [4, 3], oppDice: [3, 4], actor: 'unclear', losWin: 'me' })).toMatchObject({
      done: true,
      won: true,
    })
    expect(stret({ dice: [4, 3], oppDice: [3, 4], actor: 'unclear', losWin: 'opp' })).toMatchObject({
      done: true,
      won: false,
    })
  })

  it('úroveň soupeře se počítá do jeho hodu', () => {
    const s = stret({ dice: [4, 4], oppDice: [3, 3], oppLevel: 3 })
    expect(s.opp?.total).toBe(9)
    expect(s.won).toBe(false)
  })
})
