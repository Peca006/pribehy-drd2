import { describe, expect, it } from 'vitest'
import { emptyCharacter } from './model'
import { easeScar, healScar } from './healing'

const c = {
  ...emptyCharacter('x'),
  scars: [
    { id: 'a', attribute: 'Tělo' as const, severity: 2, note: '' },
    { id: 'b', attribute: 'Duše' as const, severity: 1, note: '' },
  ],
}

describe('hojení jizev', () => {
  it('zmírní o stupeň a jizvu se závažností 1 zahojí', () => {
    expect(easeScar(c, 'a').scars[0].severity).toBe(1)
    expect(easeScar(c, 'b').scars.map((s) => s.id)).toEqual(['a'])
    expect(easeScar(c, 'zzz')).toEqual(c)
  })
  it('zahojí úplně', () => {
    expect(healScar(c, 'a').scars.map((s) => s.id)).toEqual(['b'])
  })
})
