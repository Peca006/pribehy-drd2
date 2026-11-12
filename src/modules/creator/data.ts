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
import {
  chapters,
  commonRaceAbilities,
  creationRules,
  equipmentGroups,
  professions,
  races,
  startingKits,
  traits,
} from '../../core/library.svelte'

export interface CreationData {
  rules: CreationRules
  races: Race[]
  professions: Profession[]
  commonAbilities: Ability[]
  traits: Trait[]
  kits: StartingKit[]
  equipment: EquipmentGroup[]
}

/** `undefined`, pokud chybí data pro tvorbu postavy (s vestavěnou kostrou by to nemělo nastat). */
export function creationData(): CreationData | undefined {
  const rules = creationRules()
  if (!rules || !races().length) return undefined
  return {
    rules,
    races: races(),
    professions: professions().filter((p) => p.kind === 'zakladni'),
    commonAbilities: commonRaceAbilities(),
    traits: traits(),
    kits: startingKits(),
    equipment: equipmentGroups(),
  }
}

/** Odkaz do příručky na místo, kde je nadpis s daným textem (nebo jen na kapitolu). */
export function manualLink(chapterPrefix: string, heading: string): string | undefined {
  const ch = chapters().find((c) => c.id.startsWith(chapterPrefix))
  if (!ch) return undefined
  const h = ch.blocks.find((b) => b.type === 'heading' && b.text.replace(/\*/g, '') === heading)
  return `chapter:${ch.id}${h && h.type === 'heading' ? '#' + h.id : ''}`
}
