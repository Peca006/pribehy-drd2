import { describe, expect, it } from 'vitest'
import { sinceIndex } from './shareRange'

const revs = ['a', 'b', 'c', 'd'].map((id) => ({ id }))

describe('začátek sdílení postavy', () => {
  it('celá historie začíná od začátku', () => expect(sinceIndex(revs, 'cela', 'c', 'b')).toBe(-1))
  it('nové navazuje na poslední odeslanou, bez odeslání od začátku', () => {
    expect(sinceIndex(revs, 'nove', 'b')).toBe(1)
    expect(sinceIndex(revs, 'nove')).toBe(-1)
  })
  it('zvolený bod se sdílí včetně sebe, tedy navazuje na revizi před ním', () => {
    expect(sinceIndex(revs, 'bod', 'd', 'c')).toBe(1)
    expect(sinceIndex(revs, 'bod', undefined, 'a')).toBe(-1)
    expect(sinceIndex(revs, 'bod', undefined, 'neznama')).toBe(-1)
  })
})
