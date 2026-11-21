// Model postavy jako deník změn (event log): stav postavy se vždy odvodí z posloupnosti změn.
// Díky tomu jde ukázat historii, porovnat dva deníky před sloučením a schvalovat změny.
import type { Attribute, ContentId } from '../content/schema'
import type { RecipeLink } from '../recipes/model'
import { emptyCash, fromHeller, type Cash } from './cash'

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

/**
 * Druh Surovin (např. byliny, kov): značka (1 až 2 znaky unicode, i emotikona) a název. Druhy si vede každá postava
 * zvlášť; slouží jen k tomu, aby šlo v příběhu vysvětlit, odkud Suroviny jsou.
 */
export interface RawMaterialKind {
  mark: string
  name: string
  count: number
}

/**
 * Lektvar, mast, odvar nebo nektar: zásobník Surovin pro léčení určitého druhu Jizvy. Každá Surovina ušetří při léčení
 * 1 Zdroj. Eviduje se jen, na co je (vlastnost a druh Jizvy), kolik Surovin v něm je a krátká poznámka.
 */
export interface Potion {
  attribute: Attribute
  /** druh Jizvy, na který působí (popálenina, sečné poranění, fobie, …) */
  scar: string
  /** Suroviny v zásobníku */
  count: number
  note: string
}

/**
 * Připravená nástraha (past, třaskavina, jed…): druh, cílová vlastnost, zamýšlený účinek (Ohrožení, Jizva, vyřazení),
 * případně vložený manévr, slabina a počet kusů. Cena v Surovinách se počítá (`trapCost`), neukládá se.
 */
export interface Trap {
  name: string
  type: 'jednoducha' | 'mechanicka' | 'trask' | 'jed' | 'kontaktni' | 'plynny' | 'omamna' | 'jina'
  attribute: Attribute
  effect: 'ohrozeni' | 'jizva' | 'vyrazeni'
  maneuver: '' | 'rozsahle' | 'presne' | 'mocne' | 'lstive'
  /** další pokročilé vlastnosti nebo posílení zvláštní schopností (každá +1 Surovina) */
  extra: number
  /** čím jde nástrahu včas zaznamenat (drát přes chodbu, výrazná chuť…) */
  weakness: string
  note: string
  /** kolik kusů (dávek) je připraveno */
  count: number
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
  /** hotovost: dukáty, groše a haléře zvlášť (nic se samo nepřevádí) */
  cash: Cash
  /** Suroviny bez druhu (celkem = tohle + součet druhů) */
  rawMaterials: number
  /** druhy Surovin podle ID druhu (ID se při přenosu zachovává, i když se druh přejmenuje) */
  rawMaterialKinds: Record<string, RawMaterialKind>
  /** lektvary a masti podle ID (zásobníky Surovin pro léčení) */
  potions: Record<string, Potion>
  /** připravené nástrahy podle ID */
  traps: Record<string, Trap>
  /** odkazy na předpisy v Grimoáru (kouzla…) podle ID odkazu; stav vázaný na postavu je v odkazu */
  recipeLinks: Record<string, RecipeLink>
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
  cash: emptyCash(),
  rawMaterials: 0,
  rawMaterialKinds: {},
  potions: {},
  traps: {},
  recipeLinks: {},
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
  // starý formát: celá hotovost jedním číslem v haléřích
  if (e.path === 'cash' && typeof e.value === 'number') e = { ...e, value: fromHeller(e.value) }
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
    if (key === 'rawMaterialKinds' || key === 'potions' || key === 'traps' || key === 'recipeLinks') {
      // položky po jedné (každá = jedna cesta), aby se úpravy různých položek nepřebíjely
      const ma = (a ?? {}) as Record<string, unknown>
      const mb = (b ?? {}) as Record<string, unknown>
      for (const k of Object.keys(mb)) if (!same(ma[k], mb[k])) out.push({ path: `${key}.${k}`, value: mb[k] })
      for (const k of Object.keys(ma)) if (!(k in mb)) out.push({ path: `${key}.${k}`, value: undefined })
    } else if (key === 'attributes' || key === 'professions' || key === 'cash') {
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
