// Kouzla jako druh předpisu: typované parametry, cena podle pravidel (kapitola 36 příručky) a práce s odkazy postavy.
// Aplikace jen počítá a zapisuje; popis kouzla v příběhu si hráči odehrají mimo ni.
import { newId, type Character } from '../character/model'
import { FALLBACK_FIELDS } from './fields'
import { MAX_LINKS, type Recipe, type RecipeParams } from './model'

export const SPELL_REACH = [
  { id: '', label: 'Neurčeno' },
  { id: 'dotyk', label: 'Dotyk' },
  { id: 'rozsireny-dotyk', label: 'Rozšířený dotyk' },
  { id: 'dohled', label: 'Dohled' },
  { id: 'symbolicky-dotyk', label: 'Symbolický dotyk' },
  { id: 'obrazec', label: 'Ochranný obrazec' },
] as const
export const SPELL_RANGE = [
  { id: '', label: 'Jedna postava či věc' },
  { id: 'chyse', label: 'Chýše' },
  { id: 'statek', label: 'Statek' },
] as const
export const SPELL_DURATION = [
  { id: '', label: 'Okamžité' },
  { id: 'dlouho', label: 'Dlouho (do magického okamžiku)' },
  { id: 'velmi-dlouho', label: 'Velmi dlouho (do síly 5)' },
] as const

export interface SpellParams {
  /** obor magie (např. „Magie ohně“); text, kontrola podle schopností postavy je jinde */
  obor: string
  /** rituál: co kouzelník provádí */
  zvuky: boolean
  gesta: boolean
  substance: boolean
  /** vlastní popis rituálu */
  ritual: string
  dosah: string
  rozsah: string
  trvani: string
  /** náročné kouzlo stojí 1 Zdroj */
  narocne: boolean
  /** cena aktivací zvláštních schopností ve Zdrojích (hráč zadá podle schopnosti) */
  aktivace: number
  /** cena substance v Surovinách (podle magie, hráč zadá) */
  suroviny: number
}

export const emptySpell = (): SpellParams => ({
  obor: '',
  zvuky: false,
  gesta: false,
  substance: false,
  ritual: '',
  dosah: '',
  rozsah: '',
  trvani: '',
  narocne: false,
  aktivace: 0,
  suroviny: 0,
})

const count = (v: unknown, max: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(0, Math.floor(v))) : 0
const text = (v: unknown) => (typeof v === 'string' ? v : '')
const oneOf = (v: unknown, list: readonly { id: string }[]) => (list.some((x) => x.id === v) ? (v as string) : '')

/** Parametry kouzla z obecných parametrů předpisu (chybějící a neplatné hodnoty = výchozí). */
export function spellFrom(p: RecipeParams | undefined): SpellParams {
  const r = (p ?? {}) as Record<string, unknown>
  return {
    obor: text(r.obor),
    zvuky: r.zvuky === true,
    gesta: r.gesta === true,
    substance: r.substance === true,
    ritual: text(r.ritual),
    dosah: oneOf(r.dosah, SPELL_REACH),
    rozsah: oneOf(r.rozsah, SPELL_RANGE),
    trvani: oneOf(r.trvani, SPELL_DURATION),
    narocne: r.narocne === true,
    aktivace: count(r.aktivace, 99),
    suroviny: count(r.suroviny, 99),
  }
}

/** Obecné parametry předpisu z parametrů kouzla (výchozí hodnoty se vynechají, ať se otisk nemění zbytečně). */
export function spellToParams(s: Partial<SpellParams>): RecipeParams {
  const v = { ...emptySpell(), ...s }
  const out: RecipeParams = {}
  if (v.obor.trim()) out.obor = v.obor.trim()
  if (v.zvuky) out.zvuky = true
  if (v.gesta) out.gesta = true
  if (v.substance) out.substance = true
  if (v.ritual.trim()) out.ritual = v.ritual.trim()
  if (v.dosah) out.dosah = v.dosah
  if (v.rozsah) out.rozsah = v.rozsah
  if (v.trvani) out.trvani = v.trvani
  if (v.narocne) out.narocne = true
  if (v.aktivace > 0) out.aktivace = count(v.aktivace, 99)
  if (v.suroviny > 0) out.suroviny = count(v.suroviny, 99)
  return out
}

export interface SpellCost {
  /** Zdroje: náročnost (1) a aktivace schopností */
  zdroje: number
  /** Suroviny na substanci */
  suroviny: number
  lines: string[]
}

/** Cena kouzla: základní podoba nestojí nic, náročné 1 Zdroj, aktivace schopností a substance podle zadání. */
export function spellCost(s: SpellParams): SpellCost {
  const lines: string[] = []
  const narocne = s.narocne ? 1 : 0
  if (narocne) lines.push('+1 Zdroj náročné kouzlo')
  if (s.aktivace > 0) lines.push(`+${s.aktivace} Zdroj${s.aktivace > 1 ? 'e' : ''} aktivace schopnosti`)
  if (s.suroviny > 0) lines.push(`${s.suroviny} Surovin substance`)
  if (!lines.length) lines.push('základní kouzlo nestojí nic')
  return { zdroje: narocne + s.aktivace, suroviny: s.suroviny, lines }
}

const label = (list: readonly { id: string; label: string }[], id: string) => list.find((x) => x.id === id)?.label ?? ''

/** Stručný souhrn kouzla pro seznam a záměr zkoušky. */
export function spellSummary(name: string, s: SpellParams): string {
  const parts = [s.obor, label(SPELL_REACH, s.dosah), s.rozsah ? label(SPELL_RANGE, s.rozsah) : '', s.trvani ? label(SPELL_DURATION, s.trvani).split(' ')[0] : '']
  const cost = spellCost(s)
  const price = [cost.zdroje ? `${cost.zdroje} Zdroje` : '', cost.suroviny ? `${cost.suroviny} Surovin` : ''].filter(Boolean).join(', ')
  return [name.trim() || 'Kouzlo', ...parts.filter(Boolean), price].filter(Boolean).join(' · ')
}

/** Záměr zkoušky pro panel Hod. */
export const spellIntent = (name: string, s: SpellParams) =>
  name.trim() ? `Kouzlo: ${spellSummary(name, s)}` : `Kouzlo ad hoc: ${spellSummary('', s).replace(/^Kouzlo( · )?/, '') || 'bez parametrů'}`

export type Edited = { character: Character } | { error: string }

/**
 * Přidá k postavě odkaz na předpis; jeden předpis jen jednou. `ownField`: obor kouzla je vlastní, mimo schopnosti
 * postavy (alternativní sada povolání); značí se ve stavu odkazu a kontrola oboru ho pak nehlásí.
 */
export function addLink(c: Character, recipeId: string, linkId: string = newId(), ownField = false): Edited {
  const links = c.recipeLinks ?? {}
  if (Object.values(links).some((l) => l.recipeId === recipeId)) return { error: 'Postava už toto kouzlo má.' }
  if (Object.keys(links).length >= MAX_LINKS) return { error: `Odkazů může být nejvýš ${MAX_LINKS}.` }
  return { character: { ...c, recipeLinks: { ...links, [linkId]: { recipeId, state: ownField ? { vlastniObor: 1 } : {} } } } }
}

export function removeLink(c: Character, linkId: string): Edited {
  if (!c.recipeLinks?.[linkId]) return { error: 'Odkaz neexistuje.' }
  const rest = { ...c.recipeLinks }
  delete rest[linkId]
  return { character: { ...c, recipeLinks: rest } }
}

/** Odkazy postavy spojené s předpisy; `recipe` chybí, když předpis v Grimoáru není (např. po importu bez balíku). */
export const linkedRecipes = (
  c: Character,
  recipes: readonly Recipe[],
): { linkId: string; recipeId: string; recipe?: Recipe }[] =>
  Object.entries(c.recipeLinks ?? {})
    .map(([linkId, l]) => ({ linkId, recipeId: l.recipeId, recipe: recipes.find((r) => r.id === l.recipeId) }))
    .sort((a, b) => (a.recipe?.name ?? '￿').localeCompare(b.recipe?.name ?? '￿', 'cs'))

/** Postavy, které mají odkaz na předpis (pro potvrzení smazání). */
export const usedBy = (recipeId: string, characters: readonly Character[]): Character[] =>
  characters.filter((c) => Object.values(c.recipeLinks ?? {}).some((l) => l.recipeId === recipeId))

/** Všechny obory magie, které vestavěná tabulka zná (nabídka v Grimoáru, kde není konkrétní postava). */
export const KNOWN_FIELDS = [...new Set(Object.values(FALLBACK_FIELDS).flat())]
