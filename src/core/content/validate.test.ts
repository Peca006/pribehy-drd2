import { describe, expect, it } from 'vitest'
import { PACK_FORMAT, type ContentPack } from './schema'
import { validatePack } from './validate'

const pack = (kind: 'pokrocile' | 'mistrovske'): ContentPack => ({
  manifest: {
    format: PACK_FORMAT,
    id: 'x',
    name: 'x',
    version: '1',
    source: { book: 'x', edition: '1' },
  },
  professions: [
    {
      id: 'povolani:a',
      name: 'A',
      kind,
      intro: '',
      skills: [],
      abilities: [{ id: 'schopnost:a/b', name: 'B', text: 'text' }],
    },
  ],
})

describe('validace balíčku', () => {
  it('mistrovské povolání smí být bez dovedností, pokročilé ne', () => {
    expect(validatePack(pack('mistrovske'))).toEqual([])
    expect(validatePack(pack('pokrocile'))).toEqual(['povolani:a: žádné dovednosti'])
  })
})
