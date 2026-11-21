// Stručný popis předpisu pro seznamy (Grimoár, postava) podle jeho druhu.
import { trapSummary } from '../character/traps'
import { recipeToTrap } from './kinds'
import { RECIPE_KIND_LABELS, type Recipe } from './model'
import { spellFrom, spellSummary } from './spells'

const clip = (s: string, n = 80) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

export function recipeSummary(r: Recipe): string {
  switch (r.kind) {
    case 'kouzlo':
      return spellSummary(r.name, spellFrom(r.params))
    case 'nastraha': {
      const t = recipeToTrap(r, { count: 1 })
      return t ? trapSummary(t) : r.name
    }
    case 'lektvar':
      return r.name
    default:
      return r.description ? `${r.name}: ${clip(r.description)}` : r.name
  }
}

export const kindLabel = (r: Recipe): string => RECIPE_KIND_LABELS[r.kind]
