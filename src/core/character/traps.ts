// Nástrahy (pasti, třaskaviny, žíraviny, jedy): stručná evidence připravených nástrah postavy a výpočet ceny v Surovinách.
// Aplikace jen počítá a zapisuje; popis zamýšleného účinku a slabiny je text hráče. Čísla z pravidel jsou návrh (cenu jde přepsat).
import { ATTRIBUTES, newId, type Character, type Trap } from './model'
import { cleanCount } from './rawMaterials'

export type TrapType = 'jednoducha' | 'mechanicka' | 'trask' | 'jed' | 'kontaktni' | 'plynny' | 'omamna' | 'jina'
export type TrapEffect = 'ohrozeni' | 'jizva' | 'vyrazeni'
export type TrapManeuver = '' | 'rozsahle' | 'presne' | 'mocne' | 'lstive'

/** Druhy nástrah. Základní (jednoduchá past, běžný jed) stojí základ; pokročilé z vyhrazené dovednosti o 1 Surovinu víc. */
export const TRAP_TYPES: { id: TrapType; label: string; advanced: boolean }[] = [
  { id: 'jednoducha', label: 'Jednoduchá past', advanced: false },
  { id: 'jed', label: 'Běžný jed', advanced: false },
  { id: 'mechanicka', label: 'Mechanická past', advanced: true },
  { id: 'trask', label: 'Třaskavina nebo žíravina', advanced: true },
  { id: 'kontaktni', label: 'Kontaktní jed', advanced: true },
  { id: 'plynny', label: 'Plynný jed', advanced: true },
  { id: 'omamna', label: 'Omamná látka', advanced: true },
  { id: 'jina', label: 'Jiná nástraha', advanced: false },
]
export const TRAP_EFFECTS: { id: TrapEffect; label: string }[] = [
  { id: 'ohrozeni', label: 'Ohrožení' },
  { id: 'jizva', label: 'Jizva' },
  { id: 'vyrazeni', label: 'Vyřazení' },
]
export const TRAP_MANEUVERS: { id: TrapManeuver; label: string }[] = [
  { id: '', label: 'Bez manévru' },
  { id: 'rozsahle', label: 'Rozsáhle' },
  { id: 'presne', label: 'Přesně' },
  { id: 'mocne', label: 'Mocně' },
  { id: 'lstive', label: 'Lstivě' },
]

export const BASE_COST = 3
export const MAX_TRAPS = 40
export const MAX_NAME = 80
export const MAX_TEXT = 160
export const MAX_EXTRA = 9

const typeLabel = (id: TrapType) => TRAP_TYPES.find((t) => t.id === id)?.label ?? id
const effectLabel = (id: TrapEffect) => TRAP_EFFECTS.find((e) => e.id === id)?.label ?? id
const maneuverLabel = (id: TrapManeuver) => TRAP_MANEUVERS.find((m) => m.id === id)?.label.toLowerCase() ?? id

/** Cena jedné nástrahy v Surovinách: základ 3, +1 vyřazení (zabít či trvale vyřadit), +1 vložený manévr, +1 pokročilý druh, +1 za každou další vlastnost. */
export function trapCost(t: Pick<Trap, 'type' | 'effect' | 'maneuver' | 'extra'>): number {
  const advanced = TRAP_TYPES.find((x) => x.id === t.type)?.advanced ? 1 : 0
  return BASE_COST + (t.effect === 'vyrazeni' ? 1 : 0) + (t.maneuver ? 1 : 0) + advanced + Math.max(0, Math.floor(t.extra) || 0)
}

/** Rozpis ceny po řádcích, např. „základ 3“, „+1 vyřazení“. */
export function trapCostLines(t: Pick<Trap, 'type' | 'effect' | 'maneuver' | 'extra'>): string[] {
  const lines = [`základ ${BASE_COST}`]
  if (t.effect === 'vyrazeni') lines.push('+1 vyřazení')
  if (t.maneuver) lines.push(`+1 manévr ${maneuverLabel(t.maneuver)}`)
  if (TRAP_TYPES.find((x) => x.id === t.type)?.advanced) lines.push('+1 pokročilý druh')
  if (t.extra > 0) lines.push(`+${Math.floor(t.extra)} další vlastnosti`)
  return lines
}

const cleanText = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** Platná nástraha z hodnoty neznámého původu, nebo `undefined` (chybí název nebo vlastnost). */
export function trapFrom(v: unknown): Trap | undefined {
  if (typeof v !== 'object' || v === null) return undefined
  const r = v as Record<string, unknown>
  const name = cleanText(r.name, MAX_NAME)
  const attribute = ATTRIBUTES.find((a) => a === r.attribute)
  if (!name || !attribute) return undefined
  const type = TRAP_TYPES.find((t) => t.id === r.type)?.id ?? 'jina'
  const effect = TRAP_EFFECTS.find((e) => e.id === r.effect)?.id ?? 'ohrozeni'
  const maneuver = TRAP_MANEUVERS.find((m) => m.id === r.maneuver)?.id ?? ''
  const extra = Math.min(MAX_EXTRA, cleanCount(r.extra))
  return {
    name,
    type,
    attribute,
    effect,
    maneuver,
    extra,
    weakness: cleanText(r.weakness, MAX_TEXT),
    note: cleanText(r.note, MAX_TEXT),
    count: cleanCount(r.count),
  }
}

/** Platné nástrahy z objektu neznámého původu (nejvýš `MAX_TRAPS`; ID bez tečky). */
export function trapsFrom(raw: unknown): Record<string, Trap> {
  const out: Record<string, Trap> = {}
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return out
  for (const [id, v] of Object.entries(raw).slice(0, MAX_TRAPS)) {
    const t = trapFrom(v)
    if (t && id.length > 0 && id.length <= 100 && !id.includes('.')) out[id] = t
  }
  return out
}

/** Nástrahy v pořadí vzniku. */
export const trapList = (c: Character): { id: string; trap: Trap }[] =>
  Object.entries(c.traps ?? {})
    .map(([id, trap]) => ({ id, trap }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

export type Edited = { character: Character } | { error: string }

/** Přidá (nebo, s `id`, přepíše) nástrahu. */
export function saveTrap(c: Character, input: Partial<Trap>, id?: string): Edited {
  const t = trapFrom({ type: 'jina', effect: 'ohrozeni', maneuver: '', extra: 0, weakness: '', note: '', count: 1, ...input })
  if (!t) return { error: 'Zadejte název nástrahy a cílovou vlastnost.' }
  if (id === undefined && Object.keys(c.traps ?? {}).length >= MAX_TRAPS)
    return { error: `Nástrah může být nejvýš ${MAX_TRAPS}.` }
  if (id !== undefined && !c.traps?.[id]) return { error: 'Nástraha neexistuje.' }
  return { character: { ...c, traps: { ...c.traps, [id ?? newId()]: t } } }
}

export function removeTrap(c: Character, id: string): Edited {
  if (!c.traps?.[id]) return { error: 'Nástraha neexistuje.' }
  const rest = { ...c.traps }
  delete rest[id]
  return { character: { ...c, traps: rest } }
}

/** Přičte nebo odečte kusy nástrahy (v mezích 0 až maximum). */
export function adjustTrap(c: Character, id: string, by: number): Character {
  const t = c.traps?.[id]
  if (!t) return c
  return { ...c, traps: { ...c.traps, [id]: { ...t, count: cleanCount(t.count + by) } } }
}

/** Použije jeden kus nástrahy; poslední kus z evidence zmizí. Neznámé ID nic nezmění. */
export function useTrap(c: Character, id: string): Character {
  const t = c.traps?.[id]
  if (!t) return c
  if (t.count <= 1) {
    const r = removeTrap(c, id)
    return 'character' in r ? r.character : c
  }
  return adjustTrap(c, id, -1)
}

/** Zápis nástrahy ve stylu pravidel: „Jáma s kůly (Jednoduchá past > Tělo, mocně / Jizva; slabina: …)“. */
export function trapSummary(t: Trap): string {
  const man = t.maneuver ? `, ${maneuverLabel(t.maneuver)}` : ''
  const weak = t.weakness ? `; slabina: ${t.weakness}` : ''
  return `${t.name} (${typeLabel(t.type)} > ${t.attribute}${man} / ${effectLabel(t.effect)}${weak})`
}
