// Model postavy jako deník změn (event log): stav postavy se vždy odvodí z posloupnosti změn.
// Díky tomu jde ukázat historii, porovnat dva deníky před sloučením a schvalovat změny.
import type { Attribute, ContentId } from '../content/schema'

export const ATTRIBUTES: Attribute[] = ['Tělo', 'Duše', 'Vliv']

/** Jizva: trvalejší zranění či újma; snižuje příslušnou zdatnost o svou závažnost. */
export interface Scar {
  id: string
  attribute: Attribute
  /** závažnost 1 až 5 (výše náročnosti omezených akcí) */
  severity: number
  /** čím je jizva způsobena, jak se projevuje */
  note: string
}

export interface Character {
  id: string
  name: string
  /** pár slov o konceptu postavy */
  concept: string
  raceId?: ContentId
  cultureId?: ContentId
  /** zdatnost ve vlastnostech */
  attributes: Record<Attribute, number>
  /** úroveň v jednotlivých povoláních (ID povolání → 1–5) */
  professions: Record<ContentId, number>
  /** naučené zvláštní schopnosti (rasové i povolání) */
  abilities: ContentId[]
  /** druh zbraně pro schopnost Rodová zbraň */
  weaponKind: string
  /** povahový rys: ID z balíčku, nebo vlastní text */
  trait: string
  heroStory: string
  /** výzbroj a výstroj po řádcích */
  equipment: string[]
  /** hotovost v haléřích */
  cash: number
  /** nespotřebované body zkušeností (12 = jedno zlepšení postavy) */
  xp: number
  scars: Scar[]
  notes: string
}

export const emptyCharacter = (id: string): Character => ({
  id,
  name: '',
  concept: '',
  attributes: { Tělo: 0, Duše: 0, Vliv: 0 },
  professions: {},
  abilities: [],
  weaponKind: '',
  trait: '',
  heroStory: '',
  equipment: [],
  cash: 0,
  xp: 0,
  scars: [],
  notes: '',
})

/** Jedna změna deníku. `path` je tečkou dělená cesta, např. `attributes.Tělo` nebo `name`. */
export interface ChangeEvent {
  id: string
  at: string
  /** kdo změnu provedl (jméno hráče/vypravěče) */
  by: string
  path: string
  /** nová hodnota; `undefined` = smazání položky (jen u položek v mapách) */
  value?: unknown
  /** čitelný důvod změny, např. „Tvorba postavy“, „Přestup na 2. úroveň“ */
  note?: string
  /** revize: změny zveřejněné společně (jedním „Zveřejnit“) mají stejné ID; starší záznamy ho nemají */
  rev?: string
}

export interface CharacterLog {
  id: string
  events: ChangeEvent[]
}

const clone = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)))

/** Nastaví hodnotu na cestě; vrací novou postavu (původní se nemění). */
export function applyChange(c: Character, e: ChangeEvent): Character {
  const next = clone(c) as unknown as Record<string, unknown>
  const keys = e.path.split('.')
  let node = next
  for (const k of keys.slice(0, -1)) {
    if (typeof node[k] !== 'object' || node[k] === null) node[k] = {}
    node = node[k] as Record<string, unknown>
  }
  const last = keys[keys.length - 1]
  if (e.value === undefined) delete node[last]
  else node[last] = clone(e.value)
  return next as unknown as Character
}

export function characterOf(log: CharacterLog): Character {
  return log.events.reduce(applyChange, emptyCharacter(log.id))
}

let counter = 0
export const newId = () =>
  `${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 7)}`

/** Změny, které z `before` udělají `after` (jen tam, kde se hodnoty liší). */
export function diffCharacter(
  before: Character,
  after: Character,
): Pick<ChangeEvent, 'path' | 'value'>[] {
  const out: Pick<ChangeEvent, 'path' | 'value'>[] = []
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
  for (const key of Object.keys(after) as (keyof Character)[]) {
    if (key === 'id') continue
    const a = before[key]
    const b = after[key]
    if (same(a, b)) continue
    if (key === 'attributes' || key === 'professions') {
      const ma = a as Record<string, number>
      const mb = b as Record<string, number>
      for (const k of Object.keys(mb))
        if (ma[k] !== mb[k]) out.push({ path: `${key}.${k}`, value: mb[k] })
      for (const k of Object.keys(ma))
        if (!(k in mb)) out.push({ path: `${key}.${k}`, value: undefined })
    } else out.push({ path: key, value: b })
  }
  return out
}

export function eventsFor(
  before: Character,
  after: Character,
  by: string,
  note: string,
  at = new Date().toISOString(),
): ChangeEvent[] {
  const rev = newId()
  return diffCharacter(before, after).map((d) => ({ id: newId(), at, by, note, rev, ...d }))
}
