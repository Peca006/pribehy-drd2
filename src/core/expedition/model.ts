// Příprava a vedení výprav (viz PLAN-VYPRAVY.md). Tři vrstvy:
//  - Dobrodružství: lehký kontejner (název, téma, pozadí, volný seznam výprav),
//  - Výprava: příprava bez stavu a bez družiny (zápletka, cíl, uzlové body, příhody),
//  - Vedení (`Run`): rozehraná hra jedné družiny s jednou výpravou, drží jen stav.
// Pozadí a příhody jsou tajné: patří Průvodci a nikam se nesdílejí.
import type { CashUnit } from '../character/cash'
import { newId } from '../character/model'

export type ExpeditionStyle = 'domino' | 'puzzle'

export const STYLES: { id: ExpeditionStyle; label: string; hint: string }[] = [
  {
    id: 'domino',
    label: 'Kostky domina',
    hint: 'Cesta z místa na místo. Příhody vybíráš podle toho, jak zapadají; mezi uzlovými body se střídají.',
  },
  {
    id: 'puzzle',
    label: 'Dílky puzzle',
    hint: 'Volný pohyb po prostředí (průzkum, pátrání, podzemí). Příhody vážeš na místa a postavy.',
  },
]

/** Uzlový bod: příhoda nebo událost na určitém místě či čase (např. zvrat krátce před koncem). */
export interface Node {
  id: string
  title: string
  text: string
  /** `odpocinek` = příležitost k odpočinku (pomáhá hlídat tempo Zdrojů) */
  kind?: 'zvrat' | 'odpocinek'
}

export type LootKind = 'penize' | 'suroviny' | 'vybava' | 'trofej'

/**
 * Kořist u příhody (předdefinovaná v přípravě; ve vedení se odhalí, upřesní a rozdělí).
 * Peníze: `amount` v jednotce `unit` (výchozí groše). Suroviny: `amount` kusů druhu `mark` + `label` (název druhu; prázdné = bez druhu).
 * Výbava: `label` je položka. Trofej: `label` a `note`, bez účinku na postavu.
 */
export interface Loot {
  id: string
  kind: LootKind
  label: string
  amount?: number
  unit?: CashUnit
  mark?: string
  note?: string
}

/** Stav kořisti ve vedení: skrytá, odhalená (jde upřesnit) a rozdělená (zafixovaná). Upřesněné hodnoty přepisují přípravu. */
export interface RunLoot {
  state: 'ukryta' | 'odhalena' | 'rozdelena'
  /** člen družiny, který kořist dostal */
  to?: string
  /** zapsáno do deníku postavy na tomto zařízení (jinak si ji hráč zapíše sám) */
  applied?: boolean
  label?: string
  amount?: number
  unit?: CashUnit
  mark?: string
  note?: string
}

/**
 * Cizí postava (CP) u dobrodružství nebo u samostatné výpravy. Tajná, patří Průvodci.
 * Podle části Cizí postavy v SRD: vzhled a povaha, jednání a vztahy, vědomosti; k tomu motivace a příslušnost ke skupině.
 * `creatureId` je volitelná vazba na bytost (číselné údaje a karta v Bestiáři).
 */
export interface Npc {
  id: string
  name: string
  look: string
  conduct: string
  knowledge: string
  motive: string
  /** skupina: frakce, rod, cech… (stejný název = stejná skupina) */
  group: string
  creatureId?: string
  notes: string
}

export interface Incident {
  id: string
  title: string
  text: string
  /** `''` = před prvním uzlovým bodem, ID uzlu = po tomto uzlu, `kdykoli` = lze uvést kdykoli */
  stage: string
  /** místo (u dílků puzzle) */
  place?: string
  /** cizí postavy a protivníci: bytost z Bestiáře, nebo jen jméno */
  cast: { creatureId?: string; npcId?: string; name: string }[]
  conditions: string
  ifSuccess: string
  ifFailure: string
  loot?: Loot[]
}

export const ANYTIME = 'kdykoli'

export interface Adventure {
  id: string
  name: string
  theme: string
  /** příběhové pozadí (tajné) */
  background: string
  notes: string
  /** cizí postavy dobrodružství; výpravy si z nich vybírají (`Expedition.castIds`) */
  cast?: Npc[]
  /** výpravy v doporučeném pořadí */
  expeditionIds: string[]
  created: string
  updated: string
}

export interface Expedition {
  id: string
  name: string
  adventureId?: string
  theme: string
  /** příběhové pozadí (tajné) */
  background: string
  /** zápletka pro postavy: proč se vydají na výpravu */
  hook: string
  goal: string
  style: ExpeditionStyle
  nodes: Node[]
  incidents: Incident[]
  /** cizí postavy vybrané z dobrodružství (ID v `Adventure.cast`) */
  castIds?: string[]
  /** vlastní cizí postavy výpravy (hlavně u samostatných výprav) */
  cast?: Npc[]
  /** možná rozuzlení; není jediné možné */
  resolution: string
  notes: string
  created: string
  updated: string
}

export type RunStatus = 'probiha' | 'hotova' | 'odlozena'
export type Outcome = 'uspech' | 'neuspech' | 'jinak'

export interface RunIncident {
  state: 'nasazena' | 'odehrana' | 'odlozena'
  outcome?: Outcome
  result: string
  /** kdy byla příhoda odehrána (ISO); řadí shrnutí do žurnálu */
  at?: string
}

export interface Run {
  id: string
  name: string
  partyId: string
  expeditionId: string
  status: RunStatus
  /** dosažené uzlové body v pořadí, jak nastaly */
  reachedNodes: string[]
  incidents: Record<string, RunIncident>
  /** příhody vymyšlené při hře (jen v tomto vedení) */
  extra: Incident[]
  loot: Record<string, RunLoot>
  notes: string
  /** zápis o výpravě, který Průvodce uložil do žurnálu družiny */
  journalEntryId?: string
  started: string
  updated: string
}

const now = () => new Date().toISOString()

export const emptyAdventure = (name = ''): Adventure => ({
  id: newId(),
  name,
  theme: '',
  background: '',
  notes: '',
  expeditionIds: [],
  created: now(),
  updated: now(),
})

export const emptyExpedition = (name = '', adventureId?: string): Expedition => ({
  id: newId(),
  name,
  ...(adventureId ? { adventureId } : {}),
  theme: '',
  background: '',
  hook: '',
  goal: '',
  style: 'domino',
  nodes: [],
  incidents: [],
  resolution: '',
  notes: '',
  created: now(),
  updated: now(),
})

export const emptyRun = (name: string, partyId: string, expeditionId: string): Run => ({
  id: newId(),
  name,
  partyId,
  expeditionId,
  status: 'probiha',
  reachedNodes: [],
  incidents: {},
  extra: [],
  loot: {},
  notes: '',
  started: now(),
  updated: now(),
})

/** Výpravy dobrodružství v doporučeném pořadí (neznámá ID se přeskočí). */
export function expeditionsOf(a: Adventure, all: readonly Expedition[]): Expedition[] {
  const by = new Map(all.map((e) => [e.id, e]))
  return a.expeditionIds.map((id) => by.get(id)).filter((e): e is Expedition => !!e)
}

/** Výpravy bez dobrodružství. */
export const standalone = (all: readonly Expedition[], adventures: readonly Adventure[]): Expedition[] => {
  const used = new Set(adventures.flatMap((a) => a.expeditionIds))
  return all.filter((e) => !used.has(e.id))
}

/** Zařadí výpravu do dobrodružství (z případného jiného ho vyřadí); `undefined` ji vyřadí ze všech. Vrací změněné záznamy. */
export function assignExpedition(
  e: Expedition,
  target: Adventure | undefined,
  adventures: readonly Adventure[],
): { expedition: Expedition; adventures: Adventure[] } {
  const changed: Adventure[] = []
  for (const a of adventures) {
    const has = a.expeditionIds.includes(e.id)
    if (target?.id === a.id && !has) changed.push({ ...a, expeditionIds: [...a.expeditionIds, e.id] })
    else if (target?.id !== a.id && has)
      changed.push({ ...a, expeditionIds: a.expeditionIds.filter((x) => x !== e.id) })
  }
  const { adventureId: _old, ...rest } = e
  return { expedition: target ? { ...rest, adventureId: target.id } : rest, adventures: changed }
}

/** Posune ID v seznamu o jedno místo (`-1` nahoru, `1` dolů). */
export function move<T>(list: readonly T[], index: number, dir: -1 | 1): T[] {
  const j = index + dir
  if (j < 0 || j >= list.length) return [...list]
  const out = [...list]
  ;[out[index], out[j]] = [out[j], out[index]]
  return out
}
