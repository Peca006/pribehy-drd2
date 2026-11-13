import { describe, expect, it } from 'vitest'
import skeleton from './skeleton.json'

// Vestavěná kostra smí obsahovat jen názvy, ID a čísla, nikdy popisy ani texty pravidel.
describe('vestavěná kostra', () => {
  const json = JSON.stringify(skeleton)

  it('nemá žádné texty: všechna pole `text` a `intro` jsou prázdná, chybí `flavor`', () => {
    expect(json).not.toMatch(/"flavor"/)
    expect(json).not.toMatch(/"(text|intro)":\s*"[^"]/)
    expect(json).not.toMatch(/"items":\s*\["/)
  })

  it('nemá kapitoly, bytosti, ceník ani výbavu', () => {
    for (const k of ['chapters', 'creatures', 'equipment', 'terms'])
      expect(k in skeleton).toBe(false)
  })

  it('sady výbavy mají jen název a hotovost, bez řádků', () => {
    expect(skeleton.startingKits.length).toBeGreaterThan(0)
    for (const k of skeleton.startingKits) {
      expect(k.lines).toEqual([])
      expect(k.cash).toBeGreaterThan(0)
    }
  })

  it('má unikátní ID a úplná pravidla tvorby', () => {
    const ids: string[] = []
    for (const p of skeleton.professions) {
      ids.push(p.id, ...p.skills.map((s) => s.id), ...p.abilities.map((a) => a.id))
    }
    for (const r of skeleton.races) {
      ids.push(r.id, ...r.cultures.map((c) => c.id), ...r.abilities.map((a) => a.id))
    }
    expect(new Set(ids).size).toBe(ids.length)
    expect(skeleton.professions).toHaveLength(15)
    expect(skeleton.races).toHaveLength(5)
    expect(skeleton.creation.startingLevels).toBe(3)
  })
})
