import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { validatePack } from '../../src/core/content/validate'
import type { ContentPack } from '../../src/core/content/schema'

// Běží jen na stroji, kde byl balíček lokálně vygenerován (`npm run build:srd`); jinak se přeskočí.
const file = 'content-packs/local/drd2-pravidla-2.json'
describe.skipIf(!existsSync(file))('lokální balíček SRD', () => {
  it('je platný a má 15 povolání po 12 schopnostech', () => {
    const pack: ContentPack = JSON.parse(readFileSync(file, 'utf8'))
    expect(validatePack(pack)).toEqual([])
    expect(pack.professions).toHaveLength(15)
    expect(pack.professions.every((p) => p.abilities.length === 12)).toBe(true)
  })

  it('má data pro tvorbu postavy', () => {
    const pack: ContentPack = JSON.parse(readFileSync(file, 'utf8'))
    expect(pack.races).toHaveLength(5)
    expect(pack.races!.every((r) => r.cultures.length === 3 && r.abilities.length === 5)).toBe(true)
    // ke každé kultuře je právě jedna doporučená rasová schopnost
    for (const r of pack.races!)
      for (const c of r.cultures)
        expect(r.abilities.filter((a) => a.quickPickCulture === c.name)).toHaveLength(1)
    // ke každé úrovni 1–5 základního povolání nejvýš jedna doporučená schopnost
    // (v knize má Mastičkář doporučené jen úrovně 1–4)
    for (const p of pack.professions.filter((x) => x.kind === 'zakladni')) {
      const levels = p.abilities.map((a) => a.quickPickLevel).filter(Boolean)
      expect(new Set(levels).size).toBe(levels.length)
      expect(levels.length).toBeGreaterThanOrEqual(4)
      expect(levels.every((l) => l! >= 1 && l! <= 5)).toBe(true)
    }
    expect(pack.traits).toHaveLength(6)
    expect(pack.startingKits!.map((k) => k.cash)).toEqual([600, 240, 120])
    expect(pack.equipment!.length).toBe(8)
    expect(pack.races![0].summary).not.toMatch(/na straně/)
  })

  it('každý pojem ve slovníku ukazuje na existující nadpis a nemá společné tvary s jiným pojmem', () => {
    const pack: ContentPack = JSON.parse(readFileSync(file, 'utf8'))
    const anchors = new Set(
      pack.chapters.flatMap((c) =>
        c.blocks.filter((b) => b.type === 'heading').map((b) => `chapter:${c.id}#${(b as { id: string }).id}`),
      ),
    )
    const seen = new Map<string, string>()
    for (const t of pack.terms ?? []) {
      expect(anchors.has(t.target), `${t.name}: ${t.target}`).toBe(true)
      for (const f of [t.name, ...(t.aliases ?? [])].map((x) => x.toLowerCase())) {
        expect(seen.get(f) ?? t.id, `tvar „${f}“`).toBe(t.id)
        seen.set(f, t.id)
      }
    }
  })
})
