// Výměna předpisů mezi hráči: přiložení předpisů k balíčku postavy a jejich zařazení do Grimoáru příjemce.
// Pravidla importu (po dokončení): stejný obsah už v Grimoáru je = použije se existující předpis a odkazy v revizích
// se přepíšou; jiný obsah = vloží se jako nový předpis (při shodě ID s jiným obsahem s novým ID, nic se nepřepisuje).
import { newId } from '../character/model'
import { SHARE_VERSION, type RecipesBundle, type RevisionBundle } from '../character/share'
import { planImport } from './find'
import { sealRecipe, type Recipe, type SharedRecipe } from './model'
import { listRecipes, putRecipe } from './store'

/** ID předpisů, na které odkazují změny `recipeLinks.<id>` (hodnota s `recipeId`). */
export function recipeIdsOf(events: readonly { path: string; value?: unknown }[]): string[] {
  const out = new Set<string>()
  for (const e of events) {
    if (!e.path.startsWith('recipeLinks.')) continue
    const id = (e.value as { recipeId?: unknown } | undefined)?.recipeId
    if (typeof id === 'string') out.add(id)
  }
  return [...out]
}

/** Přiloží k balíčku předpisy, na které jeho revize odkazují (pokud je odesílatel má). */
export function attachRecipes(bundle: RevisionBundle, all: readonly Recipe[]): RevisionBundle {
  const ids = recipeIdsOf(bundle.revisions.flatMap((r) => r.events))
  const recipes: SharedRecipe[] = ids
    .map((id) => all.find((r) => r.id === id))
    .filter((r): r is Recipe => !!r)
    .map(({ id, kind, name, description, params }) => ({ id, kind, name, description, params }))
  return recipes.length ? { ...bundle, recipes } : bundle
}

/** Přepíše ID předpisů v odkazech událostí podle mapy (původní ID → ID v Grimoáru příjemce). */
export function remapEvents<T extends { path: string; value?: unknown }>(
  events: readonly T[],
  map: Record<string, string>,
): T[] {
  return events.map((e) => {
    const v = e.value as { recipeId?: unknown } | undefined
    if (!e.path.startsWith('recipeLinks.') || typeof v?.recipeId !== 'string' || !map[v.recipeId]) return e
    return { ...e, value: { ...v, recipeId: map[v.recipeId] } }
  })
}

/** Totéž pro revize balíčku. */
export function remapBundle(bundle: RevisionBundle, map: Record<string, string>): RevisionBundle {
  return { ...bundle, revisions: bundle.revisions.map((r) => ({ ...r, events: remapEvents(r.events, map) })) }
}

export interface RecipeImport {
  /** původní ID → ID v Grimoáru příjemce */
  map: Record<string, string>
  added: Recipe[]
  reused: number
  /** stejné ID, ale jiný obsah: vloženo jako nový předpis, hráč má být upozorněn */
  conflicts: string[]
}

/** Zařadí přijaté předpisy do Grimoáru (po dokončení importu). Otisk si spočítá příjemce. */
export async function importRecipes(shared: readonly SharedRecipe[]): Promise<RecipeImport> {
  const result: RecipeImport = { map: {}, added: [], reused: 0, conflicts: [] }
  const existing = await listRecipes()
  for (const s of shared) {
    const incoming = await sealRecipe(s.id, s)
    const plan = planImport(existing, incoming)
    if (plan.action === 'reuse') {
      result.map[s.id] = plan.recipeId
      result.reused++
      continue
    }
    // bez konfliktu se zachová původní ID (dá se poznat původ), při konfliktu ID dostane nové
    if (plan.conflict) result.conflicts.push(incoming.name)
    const final = await putRecipe(plan.conflict ? { ...incoming, id: newId() } : incoming)
    existing.push(final)
    result.added.push(final)
    result.map[s.id] = final.id
  }
  return result
}

/** Balíček předpisů z Grimoáru (jednotlivě i hromadně). */
export const buildRecipesBundle = (list: readonly Recipe[]): RecipesBundle => ({
  v: SHARE_VERSION,
  type: 'predpisy',
  recipes: list.map(({ id, kind, name, description, params }) => ({ id, kind, name, description, params })),
})
