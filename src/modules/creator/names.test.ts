import { describe, expect, it } from 'vitest'
import { generateName } from './names'

// Vlastní vymyšlená ukázková sada.
const ex = [
  { label: 'A', list: ['Bokar', 'Bokaran', 'Torin', 'Torvan', 'Marok'] },
  { label: 'B', list: ['Lenka Malá', 'Lena Velká', 'Lenara Zelená'] },
]

/** deterministický rng */
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

describe('generateName', () => {
  it('bez příkladů nic nevrací', () => {
    expect(generateName([])).toBeUndefined()
    expect(generateName([{ label: 'A', list: [] }])).toBeUndefined()
  })
  it('je deterministické pro stejné rng', () => {
    expect(generateName(ex, seeded(7), 'A')).toBe(generateName(ex, seeded(7), 'A'))
  })
  it('nevrací kopii příkladu, má velké první písmeno a písmena z příkladů', () => {
    const all = new Set(ex[0].list.map((n) => n.toLowerCase()))
    const letters = new Set(ex[0].list.join('').toLowerCase())
    for (let i = 1; i < 200; i++) {
      const n = generateName(ex, seeded(i), 'A')!
      expect(n).toMatch(/^\p{Lu}/u)
      expect(all.has(n.toLowerCase())).toBe(false)
      expect([...n.toLowerCase()].every((c) => letters.has(c))).toBe(true)
    }
  })
  it('víceslovná jména skládá po slovech', () => {
    for (let i = 1; i < 50; i++) {
      const n = generateName(ex, seeded(i), 'B')!
      expect(n.split(' ')).toHaveLength(2)
    }
  })
  it('neznámý štítek vybere některý z dostupných', () => {
    expect(generateName(ex, seeded(3), 'X')).toBeTruthy()
  })
})
