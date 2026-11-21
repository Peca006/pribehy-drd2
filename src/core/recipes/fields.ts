// Obory magie postavy: obor je dovednost povolání (Magie ohně, Zaříkání, Znamení, …). Postava smí sesílat jen z oborů
// povolání, která má. Bez nainstalovaného balíčku se použije vestavěná tabulka (hlídá ji test proti balíčku SRD).
import type { Character } from '../character/model'
import { foldName } from './find'

export interface ProfessionLike {
  id: string
  name: string
  skills: { name: string }[]
}

const SPECIAL = ['Zaříkání', 'Znamení', 'Hadačství']

/** Je dovednost oborem magie? (Magie …, Zaříkání, Znamení, Hadačství) */
export const isMagicField = (skillName: string): boolean =>
  /^Magie /i.test(skillName.trim()) || SPECIAL.some((s) => foldName(s) === foldName(skillName))

/** Obory podle povolání pro případ, že balíček není nainstalovaný. */
export const FALLBACK_FIELDS: Record<string, string[]> = {
  'povolani:zarikavac': ['Zaříkání'],
  'povolani:saman': ['Hadačství', 'Magie zvířat'],
  'povolani:druid': ['Magie kamene', 'Magie vody', 'Magie dřeva'],
  'povolani:vedmak': ['Znamení'],
  'povolani:carodej': ['Magie ohně', 'Magie větru'],
  'povolani:mag': ['Magie iluzí', 'Magie mysli'],
}

/** Obory magie, které postava ovládá podle svých povolání (úroveň aspoň 1); bez duplicit, v pořadí povolání. */
export function allowedFields(c: Character, professions: readonly ProfessionLike[]): string[] {
  const out: string[] = []
  for (const [id, level] of Object.entries(c.professions ?? {})) {
    if (!(level > 0)) continue
    const pack = professions.find((p) => p.id === id)
    const fields = pack ? pack.skills.map((s) => s.name).filter(isMagicField) : (FALLBACK_FIELDS[id] ?? [])
    for (const f of fields) if (!out.some((o) => foldName(o) === foldName(f))) out.push(f)
  }
  return out
}

/** Smí postava sesílat z oboru? Prázdný obor (neurčeno) smí vždy. */
export const fieldAllowed = (field: string, allowed: readonly string[]): boolean =>
  !field.trim() || allowed.some((a) => foldName(a) === foldName(field))
