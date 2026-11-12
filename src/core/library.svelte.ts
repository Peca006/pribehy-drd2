// Knihovna obsahu: nainstalované balíčky v paměti, hledání položek podle ContentId a pojmů.
import skeletonData from '../data/skeleton.json'
import { listPacks } from './content/store'
import type {
  Ability,
  CreationRules,
  EquipmentGroup,
  StartingKit,
  Trait,
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

/**
 * Vestavěný „kostrový“ balíček: jen názvy, ID a čísla (bez popisů a textů pravidel), aby aplikace fungovala
 * i bez nahraného balíčku. Nainstalované balíčky jeho položky přepisují podle ID.
 */
export const skeleton = skeletonData as unknown as ContentPack

/** Položky ze všech balíčků; při shodě ID vyhrává nainstalovaný balíček před kostrou. */
const all = <T extends { id: string }>(pick: (p: ContentPack) => T[] | undefined): T[] => {
  const seen = new Set<string>()
  const out: T[] = []
  for (const p of [...library.packs, skeleton])
    for (const x of pick(p) ?? []) {
      if (seen.has(x.id)) continue
      seen.add(x.id)
      out.push(x)
    }
  return out
}

/** Je nainstalován balíček s popisy a texty pravidel (ne jen vestavěná kostra)? */
export const hasRulesPack = (): boolean => library.packs.some((p) => p.professions?.length)

export const commonRaceAbilities = (): Ability[] => all((p) => p.commonRaceAbilities)
export const traits = (): Trait[] => all((p) => p.traits)
export const startingKits = (): StartingKit[] => all((p) => p.startingKits)
export const equipmentGroups = (): EquipmentGroup[] => all((p) => p.equipment)
/** Pravidla tvorby postavy: z nainstalovaného balíčku, jinak z kostry. */
export const creationRules = (): CreationRules | undefined =>
  [...library.packs, skeleton].find((p) => p.creation)?.creation

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
  return commonRaceAbilities().find((x) => x.id === id)
}

/** Tvar pojmu (malými písmeny) → ID pojmu; pojmy v textu se podle něj stávají odkazy. */
export function termIndex(): Map<string, string> {
  const m = new Map<string, string>()
  for (const t of terms())
    for (const f of [t.name, ...(t.aliases ?? [])]) m.set(f.toLowerCase(), t.id)
  return m
}
