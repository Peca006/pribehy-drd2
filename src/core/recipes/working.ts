// Pracovní model postavy: úložiště je normalizované (postava má jen odkazy na předpisy), ale zbytek aplikace
// pracuje s `Character.potions` a `Character.traps`. Tento modul je hranice mezi nimi:
//  - `expand` doplní lektvary a nástrahy z odkazů a předpisů,
//  - `collapse` je při zápisu vrátí do odkazů (stejný obsah = stejný předpis, jinak vznikne nový; sdílený předpis
//    se tím nikdy nemění potichu, úprava na místě je jen v Grimoáru).
import { newId, type Character, type Potion, type Trap } from '../character/model'
import { recipeToPotion, recipeToTrap, potionToRecipe, stateOf, trapToRecipe } from './kinds'
import { canonical, type Recipe, type RecipeInput, type RecipeLink } from './model'

/** Postava se zapsanými lektvary a nástrahami podle odkazů; odkaz na chybějící předpis se přeskočí. */
export function expand(c: Character, recipes: readonly Recipe[]): Character {
  const potions: Record<string, Potion> = {}
  const traps: Record<string, Trap> = {}
  for (const [id, link] of Object.entries(c.recipeLinks ?? {})) {
    const r = recipes.find((x) => x.id === link.recipeId)
    if (!r) continue
    const p = recipeToPotion(r, link.state)
    if (p) potions[id] = p
    const t = recipeToTrap(r, link.state)
    if (t) traps[id] = t
  }
  return { ...c, potions, traps }
}

/** Postava v úložném tvaru: bez rozbalených lektvarů a nástrah. */
export const stripped = (c: Character): Character => ({ ...c, potions: {}, traps: {} })

export interface Collapsed {
  /** postava v úložném tvaru (potions a traps prázdné, změny jsou v `recipeLinks`) */
  character: Character
  /** nové předpisy, které je třeba uložit (ID už mají přidělená) */
  created: { id: string; input: RecipeInput }[]
}

const contentKey = (r: { kind: Recipe['kind']; name: string; params?: Recipe['params'] }) =>
  canonical({ kind: r.kind, name: r.name, description: '', params: r.params ?? {} })

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/**
 * Přepíše změny lektvarů a nástrah mezi `before` a `after` (obojí rozbalené) do odkazů v `after`.
 * Odkaz zůstává pod původním ID lektvaru či nástrahy; změněný obsah znamená jiný předpis (nový, nebo existující se
 * stejným obsahem). Nepoužité předpisy v Grimoáru zůstávají.
 */
export function collapse(before: Character, after: Character, recipes: readonly Recipe[]): Collapsed {
  const links: Record<string, RecipeLink> = { ...after.recipeLinks }
  const created: Collapsed['created'] = []
  // totožnost podle obsahu bez popisu: popis je v Grimoáru navíc a nesmí způsobit vznik duplicitního předpisu
  const known = new Map<string, string>()
  for (const r of recipes) if (!known.has(contentKey(r))) known.set(contentKey(r), r.id)

  const recipeFor = (input: RecipeInput, current?: string): string => {
    const key = contentKey(input)
    const cur = current ? recipes.find((r) => r.id === current) : undefined
    // odkaz už míří na předpis se stejným obsahem: ponechat (i s popisem)
    if (cur && contentKey(cur) === key) return cur.id
    let id = known.get(key)
    if (!id) {
      id = newId()
      known.set(key, id)
      created.push({ id, input })
    }
    return id
  }

  const sync = <T extends { count: number; note: string }>(
    was: Record<string, T> | undefined,
    now: Record<string, T> | undefined,
    toRecipe: (x: T) => RecipeInput,
  ) => {
    for (const id of Object.keys(was ?? {})) if (!(now ?? {})[id]) delete links[id]
    for (const [id, x] of Object.entries(now ?? {})) {
      if (same(was?.[id], x)) continue
      links[id] = { recipeId: recipeFor(toRecipe(x), links[id]?.recipeId), state: { ...links[id]?.state, ...stateOf(x.count, x.note) } }
      if (!x.note) delete links[id].state.note
    }
  }
  sync(before.potions, after.potions, potionToRecipe)
  sync(before.traps, after.traps, trapToRecipe)
  return { character: { ...stripped(after), recipeLinks: links }, created }
}
