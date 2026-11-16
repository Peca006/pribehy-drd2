// Lektvary, masti, odvary a nektary: stručná evidence zásobníků Surovin pro léčení. Eviduje se, na co jsou (vlastnost a druh
// Jizvy), kolik Surovin v nich je (každá ušetří při léčení 1 Zdroj) a poznámka. Čistě funkce nad postavou.
import { ATTRIBUTES, newId, type Character, type Potion } from './model'
import type { Attribute } from '../content/schema'
import { cleanCount } from './rawMaterials'

export const MAX_POTIONS = 40
export const MAX_SCAR_TEXT = 60
export const MAX_NOTE = 120

export const cleanText = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** Platný lektvar z hodnoty neznámého původu, nebo `undefined` (chybí vlastnost nebo druh Jizvy). */
export function potionFrom(v: unknown): Potion | undefined {
  if (typeof v !== 'object' || v === null) return undefined
  const r = v as Record<string, unknown>
  const attribute = ATTRIBUTES.find((a) => a === r.attribute)
  const scar = cleanText(r.scar, MAX_SCAR_TEXT)
  if (!attribute || !scar) return undefined
  return { attribute, scar, count: cleanCount(r.count), note: cleanText(r.note, MAX_NOTE) }
}

/** Platné lektvary z objektu neznámého původu (nejvýš `MAX_POTIONS`; ID bez tečky). */
export function potionsFrom(raw: unknown): Record<string, Potion> {
  const out: Record<string, Potion> = {}
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return out
  for (const [id, v] of Object.entries(raw).slice(0, MAX_POTIONS)) {
    const p = potionFrom(v)
    if (p && id.length > 0 && id.length <= 100 && !id.includes('.')) out[id] = p
  }
  return out
}

/** Lektvary v pořadí vzniku. */
export const potionList = (c: Character): { id: string; potion: Potion }[] =>
  Object.entries(c.potions ?? {})
    .map(([id, potion]) => ({ id, potion }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

/** Lektvary určené pro danou vlastnost (kterou má léčená Jizva), s nenulovou zásobou. */
export const potionsFor = (c: Character, attribute: Attribute) =>
  potionList(c).filter(({ potion }) => potion.attribute === attribute && potion.count > 0)

export type Edited = { character: Character } | { error: string }

/** Přidá (nebo, s `id`, přepíše) lektvar. */
export function savePotion(c: Character, input: Partial<Potion>, id?: string): Edited {
  const p = potionFrom({ note: '', count: 0, ...input })
  if (!p) return { error: 'Zadejte vlastnost a druh Jizvy, na který lektvar působí.' }
  const key = id ?? newId()
  if (id === undefined && Object.keys(c.potions ?? {}).length >= MAX_POTIONS)
    return { error: `Lektvarů může být nejvýš ${MAX_POTIONS}.` }
  if (id !== undefined && !c.potions?.[id]) return { error: 'Lektvar neexistuje.' }
  return { character: { ...c, potions: { ...c.potions, [key]: p } } }
}

export function removePotion(c: Character, id: string): Edited {
  if (!c.potions?.[id]) return { error: 'Lektvar neexistuje.' }
  const rest = { ...c.potions }
  delete rest[id]
  return { character: { ...c, potions: rest } }
}

/** Přičte nebo odečte Suroviny v lektvaru (v mezích 0 až maximum). */
export function adjustPotion(c: Character, id: string, by: number): Character {
  const p = c.potions?.[id]
  if (!p) return c
  return { ...c, potions: { ...c.potions, [id]: { ...p, count: cleanCount(p.count + by) } } }
}

/**
 * Spotřebuje Suroviny z lektvarů při léčení (`use`: ID → kolik). Lektvar, který se vyčerpá, z evidence zmizí
 * (prázdné zásobníky nezahlcují seznam). Neznámé ID a víc, než lektvar má, se ignoruje.
 */
export function consumePotions(c: Character, use: Record<string, number>): Character {
  const potions = { ...c.potions }
  for (const [id, n] of Object.entries(use)) {
    const p = potions[id]
    if (!p || !(n > 0)) continue
    const left = p.count - Math.floor(n)
    if (left <= 0) delete potions[id]
    else potions[id] = { ...p, count: left }
  }
  return { ...c, potions }
}

/** Zkrácený popis pro přehled: „popálenina (Tělo)“. */
export const potionLabel = (p: Potion): string => `${p.scar} (${p.attribute})`
