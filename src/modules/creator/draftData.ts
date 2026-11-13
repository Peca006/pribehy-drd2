// Uložení rozpracované postavy z průvodce (jen v tomto zařízení, v localStorage). Uložená data se při
// načtení vždy „očistí“: ponechají se jen známá pole očekávaných typů, aby poškozený nebo starý záznam
// průvodce nerozbil.
import type { Attribute } from '../../core/content/schema'

const KEY = 'drd2-creator-draft'
const VERSION = 1
const ATTRS: Attribute[] = ['Tělo', 'Duše', 'Vliv']

export interface DraftData {
  concept: string
  name: string
  raceId?: string
  cultureId?: string
  levels: Record<string, number>
  attributes: Record<Attribute, number>
  raceAbility: string
  weaponKind: string
  abilities: string[]
  trait: string
  heroStory: string
  equipment: string[]
  cash: number
  equipMode: 'kit' | 'buy'
  kitId?: string
  /** řádky výbavy, které sem naposledy vložila sada (smí se vyměnit, jen když je výbava beze změny) */
  kitLines: string[]
  cart: Record<string, number>
}

export interface SavedDraft {
  data: DraftData
  /** krok, na kterém uživatel skončil */
  step?: string
  saved: number
}

const str = (v: unknown, max = 5000) => (typeof v === 'string' ? v.slice(0, max) : undefined)
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)
const strs = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 200) : []
function nums(v: unknown): Record<string, number> {
  const out: Record<string, number> = {}
  if (typeof v === 'object' && v !== null)
    for (const [k, x] of Object.entries(v).slice(0, 200)) {
      const n = num(x)
      if (n !== undefined) out[k] = n
    }
  return out
}

/** Očistí neznámá data na platný `DraftData`; `fallback` doplní chybějící hodnoty. */
export function sanitizeDraft(raw: unknown, fallback: DraftData): DraftData {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const attributes = { ...fallback.attributes }
  const a = (
    typeof r.attributes === 'object' && r.attributes !== null ? r.attributes : {}
  ) as Record<string, unknown>
  for (const k of ATTRS) attributes[k] = num(a[k]) ?? attributes[k]
  return {
    concept: str(r.concept) ?? '',
    name: str(r.name, 200) ?? '',
    raceId: str(r.raceId, 200),
    cultureId: str(r.cultureId, 200),
    levels: nums(r.levels),
    attributes,
    raceAbility: str(r.raceAbility, 200) ?? '',
    weaponKind: str(r.weaponKind, 200) ?? '',
    abilities: strs(r.abilities),
    trait: str(r.trait, 200) ?? '',
    heroStory: str(r.heroStory) ?? '',
    equipment: strs(r.equipment),
    cash: num(r.cash) ?? 0,
    equipMode: r.equipMode === 'buy' ? 'buy' : 'kit',
    kitId: str(r.kitId, 200),
    kitLines: strs(r.kitLines),
    cart: nums(r.cart),
  }
}

/** Je v rozpracované postavě už něco vyplněno? (Prázdný koncept se neukládá ani nenabízí.) */
export const hasContent = (d: DraftData) =>
  !!(
    d.concept.trim() ||
    d.name.trim() ||
    d.raceId ||
    Object.values(d.levels).some((v) => v > 0) ||
    d.abilities.length ||
    d.trait ||
    d.heroStory.trim() ||
    d.equipment.length ||
    d.kitId ||
    Object.keys(d.cart).length
  )

export function loadDraft(fallback: DraftData): SavedDraft | undefined {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (!raw || raw.v !== VERSION) return undefined
    const data = sanitizeDraft(raw.data, fallback)
    if (!hasContent(data)) return undefined
    return { data, step: str(raw.step, 50), saved: num(raw.saved) ?? 0 }
  } catch {
    return undefined
  }
}

export function saveDraft(data: DraftData, step: string) {
  try {
    if (!hasContent(data)) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, JSON.stringify({ v: VERSION, data, step, saved: Date.now() }))
  } catch {
    /* úložiště nemusí být dostupné; průvodce funguje i bez ukládání */
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* viz výše */
  }
}
