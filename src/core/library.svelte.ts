// Knihovna obsahu: nainstalované balíčky v paměti, hledání položek podle ContentId a pojmů.
import { listPacks } from './content/store'
import type {
  Ability,
  Chapter,
  Creature,
  CreatureKind,
  ContentId,
  ContentPack,
  Profession,
  Race,
  Term,
} from './content/schema'

export const library = $state<{ packs: ContentPack[]; loaded: boolean }>({
  packs: [],
  loaded: false,
})

export async function refreshLibrary() {
  library.packs = await listPacks()
  library.loaded = true
}

const all = <T>(pick: (p: ContentPack) => T[] | undefined): T[] =>
  library.packs.flatMap((p) => pick(p) ?? [])

export const chapters = (): Chapter[] =>
  all((p) => p.chapters).sort((a, b) => a.id.localeCompare(b.id))
export const professions = (): Profession[] => all((p) => p.professions)
export const races = (): Race[] => all((p) => p.races)
export const packCreatures = (): Creature[] => all((p) => p.creatures)
export const creatureKinds = (): CreatureKind[] => all((p) => p.creatureKinds)
export const terms = (): Term[] => all((p) => p.terms)

/** Najde schopnost podle ID v povolání i v rasách. */
export function findAbility(id: ContentId): Ability | undefined {
  for (const p of professions()) {
    const a = p.abilities.find((x) => x.id === id)
    if (a) return a
  }
  for (const r of races()) {
    const a = r.abilities.find((x) => x.id === id)
    if (a) return a
  }
  for (const p of library.packs) {
    const a = p.commonRaceAbilities?.find((x) => x.id === id)
    if (a) return a
  }
  return undefined
}
