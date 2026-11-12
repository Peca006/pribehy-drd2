// Návrh úpravy postavy (koncept před „Zveřejnit“): úplná kopie postavy, uložená jen v tomto zařízení.
// Do deníku se zapíše až při zveřejnění, a to jen rozdíl proti postavě – jako jedna revize.
import { emptyCharacter, type Character } from './model'

const KEY = (id: string) => `drd2-char-draft:${id}`
const VERSION = 1
const ATTRS = ['Tělo', 'Duše', 'Vliv'] as const

export interface CharacterDraft {
  /** počet změn v deníku v době, kdy návrh vznikl (poznáme tak, že se postava mezitím změnila) */
  base: number
  character: Character
  saved: number
}

const str = (v: unknown, max = 20000) => (typeof v === 'string' ? v.slice(0, max) : undefined)
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)
const strs = (v: unknown, max = 300) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, max) : []

/** Očistí neznámá data na platnou postavu; chybějící hodnoty vezme z `fallback`. */
export function sanitizeCharacter(raw: unknown, fallback: Character): Character {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const a = (typeof r.attributes === 'object' && r.attributes !== null ? r.attributes : {}) as Record<string, unknown>
  const attributes = { ...fallback.attributes }
  for (const k of ATTRS) attributes[k] = num(a[k]) ?? attributes[k]
  const professions: Record<string, number> = {}
  if (typeof r.professions === 'object' && r.professions !== null)
    for (const [k, v] of Object.entries(r.professions).slice(0, 100)) {
      const n = num(v)
      if (n !== undefined && n > 0) professions[k] = n
    }
  return {
    id: fallback.id,
    name: str(r.name, 200) ?? '',
    concept: str(r.concept, 1000) ?? '',
    raceId: str(r.raceId, 200),
    cultureId: str(r.cultureId, 200),
    attributes,
    professions,
    abilities: strs(r.abilities),
    weaponKind: str(r.weaponKind, 200) ?? '',
    trait: str(r.trait, 1000) ?? '',
    heroStory: str(r.heroStory) ?? '',
    equipment: strs(r.equipment, 500).map((x) => x.slice(0, 500)),
    cash: Math.max(0, num(r.cash) ?? 0),
    notes: str(r.notes) ?? '',
  }
}

export function loadCharacterDraft(id: string): CharacterDraft | undefined {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY(id)) ?? 'null')
    if (!raw || raw.v !== VERSION) return undefined
    return {
      base: num(raw.base) ?? 0,
      character: sanitizeCharacter(raw.character, emptyCharacter(id)),
      saved: num(raw.saved) ?? 0,
    }
  } catch {
    return undefined
  }
}

export function saveCharacterDraft(id: string, base: number, character: Character) {
  try {
    localStorage.setItem(KEY(id), JSON.stringify({ v: VERSION, base, character, saved: Date.now() }))
  } catch {
    /* úložiště nemusí být dostupné; úprava funguje i bez ukládání návrhu */
  }
}

export function clearCharacterDraft(id: string) {
  try {
    localStorage.removeItem(KEY(id))
  } catch {
    /* viz výše */
  }
}

export const hasCharacterDraft = (id: string) => loadCharacterDraft(id) !== undefined
