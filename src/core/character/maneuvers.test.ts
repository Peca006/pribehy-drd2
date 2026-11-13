import { describe, expect, it } from 'vitest'
import { MANEUVERS, bestTwo, maneuver } from './maneuvers'

describe('manévry', () => {
  it('přesně počítá dvě nejvyšší ze tří kostek', () => {
    expect(bestTwo([2, 6, 4])).toEqual([6, 4])
    expect(bestTwo([3, 3, 1])).toEqual([3, 3])
  })
  it('katalog má pět manévrů a hlásí se před hodem nebo po něm', () => {
    expect(MANEUVERS.map((m) => m.id).sort()).toEqual(['lstive', 'mocne', 'obrana', 'presne', 'rozsahle'])
    expect(maneuver('mocne')?.when).toBe('po')
    expect(maneuver('presne')?.when).toBe('pred')
    expect(maneuver(undefined)).toBeUndefined()
  })
})
