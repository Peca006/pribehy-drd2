// Čisté funkce nad seznamem předpisů: našeptávání podle názvu a porovnání podle otisku.
import { norm } from '../search'
import type { Recipe, RecipeKind } from './model'

/** Název pro porovnání a hledání: bez diakritiky, malými písmeny, sloučené mezery. */
export const foldName = (s: string) => norm(s).replace(/\s+/g, ' ').trim()

/**
 * Našeptávání předpisů podle začátku zadaného názvu (bez ohledu na velikost písmen a diakritiku):
 * nejdřív názvy, které tím začínají, potom ty, které to obsahují uvnitř; stejně dobré podle názvu.
 */
export function suggestRecipes(
  list: readonly Recipe[],
  query: string,
  kind?: RecipeKind,
  limit = 8,
): Recipe[] {
  const q = foldName(query)
  if (!q) return []
  const scored: { r: Recipe; rank: number; key: string }[] = []
  for (const r of list) {
    if (kind && r.kind !== kind) continue
    const key = foldName(r.name)
    const at = key.indexOf(q)
    if (at < 0) continue
    scored.push({ r, rank: at === 0 ? 0 : 1, key })
  }
  scored.sort((a, b) => a.rank - b.rank || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
  return scored.slice(0, limit).map((s) => s.r)
}

/** Předpisy se stejným otiskem obsahu (kandidáti na duplicitu; skutečnou shodu potvrdí `sameContent`). */
export const withHash = (list: readonly Recipe[], hash: string): Recipe[] =>
  list.filter((r) => r.contentHash === hash)

/** Úplné porovnání obsahu (po shodě otisku): druh, název, popis a parametry. */
export function sameContent(a: Recipe, b: Recipe): boolean {
  if (a.kind !== b.kind || a.name !== b.name || a.description !== b.description) return false
  const ka = Object.keys(a.params).sort()
  const kb = Object.keys(b.params).sort()
  return ka.length === kb.length && ka.every((k, i) => k === kb[i] && a.params[k] === b.params[k])
}

/** Jak se import předpisu vypořádá s Grimoárem příjemce. */
export type ImportAction =
  | { action: 'reuse'; recipeId: string }
  | { action: 'add'; conflict: boolean }

/**
 * Rozhodnutí o jednom předpisu z importu:
 *  - stejný obsah už v Grimoáru je: použít existující (odkaz se opraví),
 *  - jinak vložit jako nový předpis; `conflict`, když stejné `id` už existuje s jiným obsahem
 *    (nový předpis dostane nové `id`, nic se nepřepisuje a hráč má být upozorněn).
 */
export function planImport(existing: readonly Recipe[], incoming: Recipe): ImportAction {
  const same = withHash(existing, incoming.contentHash).find((r) => sameContent(r, incoming))
  if (same) return { action: 'reuse', recipeId: same.id }
  return { action: 'add', conflict: existing.some((r) => r.id === incoming.id) }
}
