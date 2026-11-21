// Zápis změn postavy s lektvary a nástrahami do deníku: změny se přepíšou do odkazů na předpisy (`collapse`),
// nové předpisy se uloží do Grimoáru a teprve pak vzniknou události deníku.
import { eventsFor, type ChangeEvent, type Character } from '../character/model'
import { refreshRecipes, recipes } from './cache.svelte'
import { sealRecipe } from './model'
import { putRecipe } from './store'
import { collapse, stripped } from './working'

/** Události deníku pro změnu `before` → `after` (obojí rozbalená postava); uloží případné nové předpisy. */
export async function changesFor(
  before: Character,
  after: Character,
  by: string,
  note: string,
): Promise<ChangeEvent[]> {
  const { character, created } = collapse(before, after, recipes())
  for (const c of created) await putRecipe(await sealRecipe(c.id, c.input))
  if (created.length) await refreshRecipes()
  return eventsFor(stripped(before), character, by, note)
}
