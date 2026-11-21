// Úprava postavy po vytvoření (logika CharacterEditor): změny návrhu postavy bez závislosti na vzhledu.
import type { Ability, Profession, Race } from '../content/schema'
import type { Attribute } from '../content/schema'
import { ATTRIBUTES, newId, type Character } from './model'

export const MAX_PROFESSION_LEVEL = 5

export interface AbilityGroup {
  title: string
  abilities: Ability[]
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
  for (const p of all) if ((c.professions[p.id] ?? 0) > 0) out.push({ title: p.name, abilities: p.abilities })
  return out
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
