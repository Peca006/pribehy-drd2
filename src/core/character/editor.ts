// Úprava postavy po vytvoření (logika CharacterEditor): změny návrhu postavy bez závislosti na vzhledu.
import type { Ability, CreationRules, Profession, Race } from '../content/schema'
import type { Attribute } from '../content/schema'
import { extraAbilities } from './check'
import { ATTRIBUTES, newId, type Character } from './model'

export const MAX_PROFESSION_LEVEL = 5

export interface AbilityGroup {
  title: string
  abilities: Ability[]
  /** povolání, ze kterého skupina je (rasová skupina ho nemá) */
  professionId?: string
}

/** Nabídky dovedností: rasa (se společnými rasovými) a povolání, která postava má. */
export function abilityGroups(
  c: Pick<Character, 'professions'>,
  race: Race | undefined,
  common: readonly Ability[],
  all: readonly Profession[],
): AbilityGroup[] {
  const out: AbilityGroup[] = []
  if (race) out.push({ title: `Rasa: ${race.name}`, abilities: [...race.abilities, ...common] })
  for (const p of all) if ((c.professions[p.id] ?? 0) > 0) out.push({ title: p.name, abilities: p.abilities, professionId: p.id })
  return out
}

export interface Usage {
  have: number
  allowed: number
  /** `over` = víc, než dovolují pravidla; `under` = ještě chybí; `ok` = sedí */
  state: 'ok' | 'over' | 'under'
}

/** Kolik schopností povolání má postava a kolik jich úroveň dovoluje (zlepšení zdatnosti přidává navíc). */
export function professionUsage(
  c: Pick<Character, 'professions' | 'abilities' | 'attributes'>,
  p: Profession,
  rules: CreationRules,
): Usage {
  const have = p.abilities.filter((a) => c.abilities.includes(a.id)).length
  const allowed = (c.professions[p.id] ?? 0) * rules.abilitiesPerLevel
  const state = have > allowed + extraAbilities(c, rules) ? 'over' : have < allowed ? 'under' : 'ok'
  return { have, allowed, state }
}

/** Dovednosti postavy, které žádná nabídka nezná (po změně rasy či povolání). */
export const orphanAbilities = (c: Pick<Character, 'abilities'>, groups: readonly AbilityGroup[]): string[] => {
  const known = new Set(groups.flatMap((g) => g.abilities.map((a) => a.id)))
  return c.abilities.filter((a) => !known.has(a))
}

export const toggleAbility = (c: Character, abilityId: string): Character => ({
  ...c,
  abilities: c.abilities.includes(abilityId)
    ? c.abilities.filter((a) => a !== abilityId)
    : [...c.abilities, abilityId],
})

/** Úroveň povolání; nula a méně povolání odebere, nejvýše 5. */
export function withProfessionLevel(c: Character, professionId: string, level: number): Character {
  const professions = { ...c.professions }
  if (level <= 0) delete professions[professionId]
  else professions[professionId] = Math.min(MAX_PROFESSION_LEVEL, level)
  return { ...c, professions }
}

export const withNewScar = (c: Character): Character => ({
  ...c,
  scars: [...c.scars, { id: newId(), attribute: 'Tělo', severity: 1, note: '' }],
})

/** Zdatnost po odečtení Jizev (nejméně 0). */
export function effectiveAttributes(c: Pick<Character, 'attributes' | 'scars'>): Record<Attribute, number> {
  return Object.fromEntries(
    ATTRIBUTES.map((a) => [
      a,
      Math.max(0, c.attributes[a] - c.scars.filter((s) => s.attribute === a).reduce((n, s) => n + s.severity, 0)),
    ]),
  ) as Record<Attribute, number>
}

/** Přidá položku výbavy; prázdný název nic nepřidá. */
export const withItem = (c: Character, item: string): Character =>
  item.trim() ? { ...c, equipment: [...c.equipment, item.trim()] } : c
