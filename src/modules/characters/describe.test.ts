import { describe, expect, it } from 'vitest'
import { describeChange, pathLabel } from './describe'

const change = (before: unknown, after: unknown) => ({ path: 'recipeLinks.l1', before, after }) as never

describe('popis změny odkazu na předpis', () => {
  it('přidání, odebrání a změna stavu', () => {
    expect(pathLabel('recipeLinks.l1')).toBe('Předpis')
    expect(describeChange(change(undefined, { recipeId: 'a', state: {} }))).toEqual(['+ předpis (odkaz do Grimoáru)'])
    expect(describeChange(change({ recipeId: 'a', state: {} }, undefined))).toEqual(['− předpis (odkaz do Grimoáru)'])
    expect(
      describeChange(change({ recipeId: 'a', state: { zdroje: 1 } }, { recipeId: 'a', state: { zdroje: 3 } })),
    ).toEqual(['zdroje: 1 → 3'])
    expect(describeChange(change({ recipeId: 'a', state: {} }, { recipeId: 'b', state: {} }))).toEqual([
      'odkaz míří na jiný předpis',
    ])
  })
})
