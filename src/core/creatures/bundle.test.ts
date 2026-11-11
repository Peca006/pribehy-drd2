import { describe, expect, it } from 'vitest'
import type { Creature } from '../content/schema'
import { exportBundle, newCreatureId, parseBundle, sanitizeCreature } from './bundle'

// Vymyšlená bytost – záměrně nejde o obsah Bestiáře.
const bytost: Creature = {
  id: 'vlastni:lesni-skret',
  name: 'Lesní skřet',
  kind: 'vlastni',
  characteristic: { min: 1, max: 2, note: 'běh' },
  fate: 4,
  limits: { Tělo: 3, Duše: 2, Vliv: 2 },
  stats: [{ label: 'Talenty', value: '*Zákeřník*' }],
  description: 'Vymyšlený popis.',
  sections: [{ id: 'jak-bojuje', title: 'Jak bojuje', text: '» z úkrytu' }],
  source: 'user',
}

describe('výměna bytostí', () => {
  it('export a zpětný import dá stejnou bytost', () => {
    const { creatures, errors } = parseBundle(exportBundle([bytost], 'Moje'))
    expect(errors).toEqual([])
    const expected = { ...bytost }
    delete expected.source
    expect(creatures).toEqual([expected])
  })

  it('přijme i holé pole a jednu bytost', () => {
    expect(parseBundle(JSON.stringify([bytost])).creatures).toHaveLength(1)
    expect(parseBundle(JSON.stringify(bytost)).creatures).toHaveLength(1)
  })

  it('odmítne cizí typ balíčku, špatný JSON a přeskočí položky bez názvu', () => {
    expect(parseBundle('{"type":"jine","creatures":[]}').errors).toHaveLength(1)
    expect(parseBundle('nejde to').errors).toEqual(['Text není platný JSON.'])
    const r = parseBundle(JSON.stringify({ creatures: [{ name: ' ' }, { name: 'Ok' }] }))
    expect(r.creatures.map((c) => c.name)).toEqual(['Ok'])
    expect(r.errors).toHaveLength(1)
  })

  it('očistí neznámá a nesprávně typovaná pole', () => {
    const c = sanitizeCreature({
      name: 'X',
      fate: 'moc',
      limits: { Tělo: 5, Síla: 9 },
      stats: [
        { label: 'a', value: 1 },
        { label: 'ok', value: 'v' },
      ],
      script: '<script>',
    })!
    expect(c.fate).toBeUndefined()
    expect(c.limits).toEqual({ Tělo: 5 })
    expect(c.stats).toEqual([{ label: 'ok', value: 'v' }])
    expect('script' in c).toBe(false)
  })

  it('unikátní ID při kolizi', () => {
    expect(newCreatureId('Lesní skřet', ['vlastni:lesni-skret'])).toBe('vlastni:lesni-skret-2')
    expect(newCreatureId('', [])).toBe('vlastni:bytost')
  })
})
