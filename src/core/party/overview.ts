// Přehled družiny pro Průvodce: z postav členů v tomto zařízení vybere zdatnost (po jizvách), povolání, jizvy
// a nespotřebované zkušenosti. Členové bez místní postavy se v přehledu neukazují (postava je u hráče).
import type { Attribute } from '../content/schema'
import { ATTRIBUTES, characterOf, type CharacterLog } from '../character/model'
import { effectiveAttributes } from '../character/play'
import type { Member } from './model'

export interface OverviewRow {
  member: Member
  name: string
  attributes: Record<Attribute, number>
  /** zdatnost snížená jizvami (jen u vlastností, kde jizva je) */
  reduced: Attribute[]
  professions: string[]
  scars: string[]
  xp: number
}

export function partyOverview(
  members: Member[],
  logs: CharacterLog[],
  professionName: (id: string) => string,
): OverviewRow[] {
  const rows: OverviewRow[] = []
  for (const m of members) {
    const log = m.characterId ? logs.find((l) => l.id === m.characterId) : undefined
    if (!log) continue
    const c = characterOf(log)
    const attributes = effectiveAttributes(c)
    rows.push({
      member: m,
      name: c.name || m.name,
      attributes,
      reduced: ATTRIBUTES.filter((a) => attributes[a] < c.attributes[a]),
      professions: Object.entries(c.professions)
        .filter(([, lvl]) => lvl > 0)
        .map(([id, lvl]) => `${professionName(id)} ${lvl}`),
      scars: c.scars.map((s) => `${s.attribute} −${s.severity}${s.note ? ` (${s.note})` : ''}`),
      xp: c.xp,
    })
  }
  return rows
}
