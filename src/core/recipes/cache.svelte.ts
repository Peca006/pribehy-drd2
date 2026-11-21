// Předpisy v paměti: aby šlo postavu rozbalit (`expand`) synchronně a seznamy se překreslovaly po změně Grimoáru.
// `$state.raw` jako u knihovny obsahu: reaktivní je jen přiřazení celé proměnné (`refreshRecipes`), proto jen čtecí pohled.
import { listRecipes } from './store'
import type { Recipe } from './model'

let state = $state.raw<{ recipes: Recipe[]; loaded: boolean }>({ recipes: [], loaded: false })

/** Všechny předpisy v Grimoáru (po `refreshRecipes`). */
export const recipes = (): Recipe[] => state.recipes
export const recipesLoaded = (): boolean => state.loaded

export async function refreshRecipes(): Promise<Recipe[]> {
  const list = await listRecipes()
  state = { recipes: list, loaded: true }
  return list
}
