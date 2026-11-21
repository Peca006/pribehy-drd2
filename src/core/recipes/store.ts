// Úložiště předpisů (Grimoár hráče) v IndexedDB.
import { repo } from '../db'
import { newId } from '../character/model'
import { MAX_RECIPES, sealRecipe, type Recipe, type RecipeInput } from './model'

const recipes = repo<Recipe>('recipes')

export const listRecipes = () => recipes.list()
export const getRecipe = (id: string) => recipes.get(id)

/**
 * Uloží nový předpis, nebo (s `id`) upraví existující. Otisk a čas úpravy se vždy přepočítají,
 * přebírá se jen očištěný obsah. Předpis musí mít druh a název.
 */
export async function saveRecipe(input: RecipeInput, id?: string): Promise<Recipe> {
  if (id === undefined && (await listRecipes()).length >= MAX_RECIPES)
    throw new Error(`Předpisů může být nejvýš ${MAX_RECIPES}.`)
  if (id !== undefined && !(await getRecipe(id))) throw new Error('Předpis neexistuje.')
  const recipe = await sealRecipe(id ?? newId(), input)
  await recipes.put(recipe)
  return recipe
}

/** Uloží už dokončený předpis (import): ID i otisk jsou hotové, ukládá se bez další úpravy. */
export async function putRecipe(recipe: Recipe): Promise<Recipe> {
  if (!(await getRecipe(recipe.id)) && (await listRecipes()).length >= MAX_RECIPES)
    throw new Error(`Předpisů může být nejvýš ${MAX_RECIPES}.`)
  await recipes.put(recipe)
  return recipe
}

export const removeRecipe = (id: string) => recipes.remove(id)
