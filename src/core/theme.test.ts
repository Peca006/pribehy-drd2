import { describe, expect, it } from 'vitest'
import { tokensToCss } from './theme'

describe('tokensToCss', () => {
  it('převede tokeny na CSS deklarace', () => {
    expect(tokensToCss({ '--drd-bg': '#000', '--drd-gap': '1rem' })).toBe(
      '--drd-bg:#000;--drd-gap:1rem;',
    )
  })
})
