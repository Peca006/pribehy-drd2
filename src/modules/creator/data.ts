// Data pro tvorbu postavy z nainstalovaných balíčků (první balíček, který je poskytuje, vyhrává).
import type {
  Ability,
  CreationRules,
  EquipmentGroup,
  Profession,
  Race,
  StartingKit,
  Trait,
} from '../../core/content/schema'
import { chapters, library, professions, races } from '../../core/library.svelte'

export interface CreationData {
  rules: CreationRules
  races: Race[]
  professions: Profession[]
  commonAbilities: Ability[]
  traits: Trait[]
  kits: StartingKit[]
  equipment: EquipmentGroup[]
}

/** `undefined`, pokud žádný balíček neobsahuje data pro tvorbu postavy. */
export function creationData(): CreationData | undefined {
  const pack = library.packs.find((p) => p.creation && p.races?.length)
  if (!pack?.creation) return undefined
  return {
    rules: pack.creation,
    races: races(),
    professions: professions().filter((p) => p.kind === 'zakladni'),
    commonAbilities: library.packs.flatMap((p) => p.commonRaceAbilities ?? []),
    traits: library.packs.flatMap((p) => p.traits ?? []),
    kits: library.packs.flatMap((p) => p.startingKits ?? []),
    equipment: library.packs.flatMap((p) => p.equipment ?? []),
  }
}

/** Odkaz do příručky na místo, kde je nadpis s daným textem (nebo jen na kapitolu). */
export function manualLink(chapterPrefix: string, heading: string): string | undefined {
  const ch = chapters().find((c) => c.id.startsWith(chapterPrefix))
  if (!ch) return undefined
  const h = ch.blocks.find((b) => b.type === 'heading' && b.text.replace(/\*/g, '') === heading)
  return `chapter:${ch.id}${h && h.type === 'heading' ? '#' + h.id : ''}`
}
