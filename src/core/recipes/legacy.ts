// Převod starého formátu: lektvary (`potions.<id>`) a nástrahy (`traps.<id>`) zapsané přímo v deníku postavy se
// převádějí na odkazy na předpisy v Grimoáru (`recipeLinks.<id>`). Převádí se jednou pro celý deník (historie se
// přepíše, ID lektvaru či nástrahy zůstává ID odkazu) a při importu balíčků z aplikace ve starém formátu.
import type { ChangeEvent } from '../character/model'
import { potionFrom } from '../character/potions'
import { trapFrom } from '../character/traps'
import type { Bundle } from '../character/share'
import { listLogs, saveLog } from '../character/store'
import { importRecipes, remapEvents } from './exchange'
import { potionToRecipe, stateOf, trapToRecipe } from './kinds'
import { canonical, type RecipeInput, type SharedRecipe } from './model'

type Ev = { path: string; value?: unknown }

export const isLegacyPath = (path: string): boolean => /^(potions|traps)\.[^.]+$/.test(path)

/** Převodník: jedno sdílené přiřazení obsahu k předpisům, ať se stejný lektvar či nástraha převede na jeden předpis. */
export function legacyConverter() {
  const byContent = new Map<string, string>()
  const recipes: SharedRecipe[] = []
  const recipeFor = (input: RecipeInput): string => {
    const key = canonical({ description: '', params: {}, ...input })
    let id = byContent.get(key)
    if (!id) {
      id = `m${recipes.length.toString(36)}${Math.random().toString(36).slice(2, 8)}`
      byContent.set(key, id)
      recipes.push({ id, kind: input.kind, name: input.name, description: '', params: input.params ?? {} })
    }
    return id
  }
  return {
    /** Přepíše události starého formátu; neplatné hodnoty se vynechají, smazání zůstává smazáním. */
    convert<T extends Ev>(events: readonly T[]): T[] {
      const out: T[] = []
      for (const e of events) {
        if (!isLegacyPath(e.path)) {
          out.push(e)
          continue
        }
        const [kind, id] = e.path.split('.')
        const path = `recipeLinks.${id}`
        if (e.value === undefined || e.value === null) {
          out.push({ ...e, path, value: undefined })
          continue
        }
        const potion = kind === 'potions' ? potionFrom(e.value) : undefined
        const trap = kind === 'traps' ? trapFrom(e.value) : undefined
        const item = potion ?? trap
        if (!item) continue
        const input = potion ? potionToRecipe(potion) : trapToRecipe(trap!)
        out.push({ ...e, path, value: { recipeId: recipeFor(input), state: stateOf(item.count, item.note) } })
      }
      return out
    },
    recipes: () => recipes,
  }
}

/** Balíček ze starého formátu převede na nový (odkazy na předpisy + přiložené předpisy); nový formát nechá být. */
export function upgradeBundle(bundle: Bundle): Bundle {
  if (bundle.type !== 'revize' || !bundle.revisions.some((r) => r.events.some((e) => isLegacyPath(e.path)))) return bundle
  const conv = legacyConverter()
  const revisions = bundle.revisions
    .map((r) => ({ ...r, events: conv.convert(r.events) }))
    .filter((r) => r.events.length)
  const known = new Set((bundle.recipes ?? []).map((r) => r.id))
  const recipes = [...(bundle.recipes ?? []), ...conv.recipes().filter((r) => !known.has(r.id))]
  return { ...bundle, revisions, ...(recipes.length ? { recipes } : {}) }
}

/** Převede všechny deníky ve starém formátu (jednorázově při spuštění). Vrací počet převedených deníků. */
export async function migrateLegacyLogs(): Promise<number> {
  let n = 0
  for (const log of await listLogs()) {
    if (!log.events.some((e) => isLegacyPath(e.path))) continue
    const conv = legacyConverter()
    const events = conv.convert(log.events) as ChangeEvent[]
    const imp = await importRecipes(conv.recipes())
    await saveLog({ ...log, events: remapEvents(events, imp.map) })
    n++
  }
  return n
}
