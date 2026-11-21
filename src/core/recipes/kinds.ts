// Druhy předpisů lektvar a nástraha: převody mezi pracovním modelem postavy (`Potion`, `Trap`) a obecným předpisem.
// Předpis nese to, co se u všech postav shoduje (vlastnost a druh Jizvy; název, druh, účinek…). To, co patří jen
// postavě (počet Surovin či kusů a poznámka), je ve stavu odkazu (`RecipeLink.state`).
import type { Potion, Trap } from '../character/model'
import { potionFrom, potionLabel } from '../character/potions'
import { trapFrom } from '../character/traps'
import type { Recipe, RecipeInput, RecipeLink } from './model'

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
const str = (v: unknown) => (typeof v === 'string' ? v : '')

/** Stav odkazu z počtu a poznámky (prázdná poznámka se neukládá). */
export const stateOf = (count: number, note: string): RecipeLink['state'] =>
  note ? { count, note } : { count }

/** Lektvar → předpis: název je zkrácený popis „popálenina (Tělo)“, parametry vlastnost a druh Jizvy. */
export const potionToRecipe = (p: Potion): RecipeInput => ({
  kind: 'lektvar',
  name: potionLabel(p),
  params: { vlastnost: p.attribute, jizva: p.scar },
})

/** Předpis a stav odkazu → lektvar (nebo `undefined`, když předpis není lektvar či je poškozený). */
export function recipeToPotion(r: Recipe, state: RecipeLink['state']): Potion | undefined {
  if (r.kind !== 'lektvar') return undefined
  return potionFrom({ attribute: r.params.vlastnost, scar: r.params.jizva, count: num(state.count), note: str(state.note) })
}

/** Nástraha → předpis (bez počtu kusů a poznámky, ty jsou ve stavu odkazu). */
export const trapToRecipe = (t: Trap): RecipeInput => ({
  kind: 'nastraha',
  name: t.name,
  params: { druh: t.type, vlastnost: t.attribute, ucinek: t.effect, manevr: t.maneuver, extra: t.extra, slabina: t.weakness },
})

export function recipeToTrap(r: Recipe, state: RecipeLink['state']): Trap | undefined {
  if (r.kind !== 'nastraha') return undefined
  return trapFrom({
    name: r.name,
    type: r.params.druh,
    attribute: r.params.vlastnost,
    effect: r.params.ucinek,
    maneuver: r.params.manevr,
    extra: num(r.params.extra),
    weakness: str(r.params.slabina),
    note: str(state.note),
    count: num(state.count),
  })
}
