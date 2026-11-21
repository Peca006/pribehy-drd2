// Stručný popis předpisu pro seznamy (Grimoár, postava) podle jeho druhu.
import { trapSummary } from '../character/traps'
import { potionLabel } from '../character/potions'
import { recipeToPotion, recipeToTrap } from './kinds'
import { RECIPE_KIND_LABELS, type Recipe } from './model'
import { spellFrom, spellSummary } from './spells'

export function recipeSummary(r: Recipe): string {
  switch (r.kind) {
    case 'kouzlo':
      return spellSummary(r.name, spellFrom(r.params))
    case 'nastraha': {
      const t = recipeToTrap(r, { count: 1 })
      return t ? trapSummary(t) : r.name
    }
    case 'lektvar': {
      const p = recipeToPotion(r, {})
      return p ? potionLabel(p) : r.name
    }
    default:
      return r.name
  }
}

export const kindLabel = (r: Recipe): string => RECIPE_KIND_LABELS[r.kind]
