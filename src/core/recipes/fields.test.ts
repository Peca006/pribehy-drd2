import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../character/model'
import { FALLBACK_FIELDS, allowedFields, fieldAllowed, isMagicField } from './fields'

const pack = JSON.parse(readFileSync('content-packs/srd/drd2-pravidla-2.json', 'utf8')) as {
  professions: { id: string; name: string; skills: { name: string }[] }[]
}

describe('obory magie', () => {
  it('rozpozná dovednosti, které jsou obory', () => {
    for (const n of ['Magie ohně', 'Zaříkání', 'znameni', 'Hadačství']) expect(isMagicField(n)).toBe(true)
    for (const n of ['Výroba elixírů', 'Šplhání', '']) expect(isMagicField(n)).toBe(false)
  })

  it('vestavěná tabulka odpovídá balíčku SRD (žádné chybějící ani přebytečné obory)', () => {
    const derived: Record<string, string[]> = {}
    for (const p of pack.professions) {
      const f = p.skills.map((s) => s.name).filter(isMagicField)
      if (f.length) derived[p.id] = f
    }
    expect(FALLBACK_FIELDS).toEqual(derived)
  })

  it('postava smí jen obory svých povolání (s balíčkem i bez něj)', () => {
    const c = { ...emptyCharacter('c'), professions: { 'povolani:carodej': 2, 'povolani:bojovnik': 1, 'povolani:mag': 0 } }
    expect(allowedFields(c, pack.professions)).toEqual(['Magie ohně', 'Magie větru'])
    expect(allowedFields(c, [])).toEqual(['Magie ohně', 'Magie větru'])
    expect(allowedFields(emptyCharacter('x'), pack.professions)).toEqual([])
  })

  it('kontrola oboru: bez diakritiky a velikosti písmen, prázdný obor smí vždy', () => {
    const allowed = ['Magie ohně', 'Magie větru']
    expect(fieldAllowed('MAGIE OHNE', allowed)).toBe(true)
    expect(fieldAllowed('Magie vody', allowed)).toBe(false)
    expect(fieldAllowed('  ', [])).toBe(true)
    expect(fieldAllowed('Magie ohně', [])).toBe(false)
  })

  it('dvě povolání se stejným oborem ho nabídnou jednou', () => {
    const profs = [
      { id: 'a', name: 'A', skills: [{ name: 'Magie ohně' }] },
      { id: 'b', name: 'B', skills: [{ name: 'magie ohne' }, { name: 'Znamení' }] },
    ]
    const c = { ...emptyCharacter('c'), professions: { a: 1, b: 1 } }
    expect(allowedFields(c, profs)).toEqual(['Magie ohně', 'Znamení'])
  })
})
