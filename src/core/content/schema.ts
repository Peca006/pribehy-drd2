// Schéma obsahového balíčku (content pack). Aplikace sama žádné texty pravidel neobsahuje;
// balíčky se načítají zvlášť. Texty jsou v „mini-markdownu“: odstavce odděleny prázdným řádkem,
// `*kurzíva*`, `**tučně**`, `***herní pojem***`, odkazy `[text](chapter:ID#kotva)`, seznamy `- `.

export const PACK_FORMAT = 1

export type Markdown = string

/** Stabilní identifikátor položky, např. `povolani:bojovnik` nebo `schopnost:bojovnik/gladiator`. */
export type ContentId = string

export type Attribute = 'Tělo' | 'Duše' | 'Vliv'

export interface PackManifest {
  format: typeof PACK_FORMAT
  id: string
  name: string
  version: string
  source: { book: string; edition: string }
  /** balíčky, jejichž obsah tento balíček předpokládá */
  requires?: string[]
}

export interface Skill {
  id: ContentId
  name: string
  /** chybí-li, vlastnost určuje `attributeNote` (např. „podle prováděné akce“) */
  attribute?: Attribute
  attributeNote?: string
  /** popis oblastí použití (odrážky) */
  items: Markdown[]
}

export interface Ability {
  id: ContentId
  name: string
  attribute?: Attribute
  attributeNote?: string
  /** od jaké úrovně je „rychlá volba“ při tvorbě postavy */
  quickPickLevel?: number
  /** rasová schopnost: kultura, pro kterou je „rychlá volba“ (název kultury) */
  quickPickCulture?: string
  flavor?: Markdown
  text: Markdown
}

export type ProfessionKind = 'zakladni' | 'pokrocile' | 'mistrovske'

export interface Profession {
  id: ContentId
  name: string
  kind: ProfessionKind
  intro: Markdown
  skills: Skill[]
  abilities: Ability[]
}

export interface ListItem {
  text: Markdown
  items?: ListItem[]
}

/** Blok textu kapitoly. Nadpisy jsou ploché (úroveň 2–4); úroveň 1 je název kapitoly. */
export type Block =
  | { type: 'heading'; level: 2 | 3 | 4; id: string; text: string }
  | { type: 'p'; text: Markdown }
  | { type: 'list'; items: ListItem[] }
  /** citace (typicky „Příklad“) */
  | { type: 'quote'; blocks: Block[] }
  /** rámeček s nadpisem (zdůrazněné pravidlo, rada) */
  | { type: 'card'; title: string; blocks: Block[] }
  | { type: 'table'; header: string[]; align: ('left' | 'right' | 'center')[]; rows: Markdown[][] }
  | { type: 'image'; alt: string; src: string }
  | { type: 'rule' }

export interface Chapter {
  /** např. `31-zakladni-pravidla` (pořadí podle čísla) */
  id: string
  title: string
  blocks: Block[]
}

export interface Culture {
  id: ContentId
  name: string
  /** upřesnění v závorce nadpisu, např. „Elfové Domů“ */
  alias?: string
  text: Markdown
}

export interface Race {
  id: ContentId
  name: string
  /** krátký přehled pro výběr (z kapitoly o tvorbě hrdiny) */
  summary?: Markdown
  /** úvodní věta (motto) z kapitoly o rasách */
  tagline?: Markdown
  /** popis rasy (odstavce) */
  text: Markdown
  names: { label: string; list: string[] }[]
  cultures: Culture[]
  abilities: Ability[]
}

/** Povahový rys k výběru při tvorbě postavy. */
export interface Trait {
  id: ContentId
  name: string
  flavor?: Markdown
  /** kdy se rys uplatní */
  text: Markdown
}

/** Peněžní hodnoty se vedou v haléřích (10 haléřů = 1 groš, 10 grošů = 1 dukát). */
export interface Price {
  /** původní zápis z ceníku */
  text: Markdown
  /** cena v haléřích; u rozpětí dolní hranice */
  min?: number
  max?: number
}

export interface EquipmentItem {
  id: ContentId
  name: Markdown
  price: Price
}

export interface EquipmentGroup {
  id: ContentId
  name: string
  items: EquipmentItem[]
}

/** Předpřipravená počáteční výbava („rychlá volba“). */
export interface StartingKit {
  id: ContentId
  name: string
  /** řádky „Výzbroj“, „Výstroj“, „Hotovost“ */
  lines: { label: string; text: Markdown }[]
  /** hotovost v haléřích, je-li z textu zřejmá */
  cash?: number
}

/** Číselné parametry tvorby postavy (z kapitoly o tvorbě hrdiny). */
export interface CreationRules {
  /** počet úrovní povolání na začátku */
  startingLevels: number
  /** body zdatnosti k rozdělení mezi tři vlastnosti */
  attributePoints: number
  attributeMin: number
  /** doporučené minimum zdatnosti (pod ním je postava „velmi slabá“) */
  attributeRecommendedMin: number
  /** rasových schopností na začátku (nebo Rodová zbraň) */
  raceAbilities: number
  /** schopností povolání za každou úroveň */
  abilitiesPerLevel: number
  /** rozpočet na nákup výbavy v haléřích */
  purchaseBudget: number
}

/** Herní pojem s odkazem na jeho vysvětlení (základ rejstříku pojmů). */
export interface Term {
  id: ContentId
  name: string
  /** další tvary, pod kterými se pojem v textu hledá */
  aliases?: string[]
  /** kam pojem vede, např. `chapter:31-zakladni-pravidla#presne` */
  target: string
  /** jednověté vysvětlení do bublinové nápovědy */
  summary?: Markdown
}

export interface ContentPack {
  manifest: PackManifest
  chapters?: Chapter[]
  professions: Profession[]
  races?: Race[]
  /** schopnosti dostupné každé rase (např. Rodová zbraň) */
  commonRaceAbilities?: Ability[]
  traits?: Trait[]
  equipment?: EquipmentGroup[]
  startingKits?: StartingKit[]
  creation?: CreationRules
  terms?: Term[]
}

/** Překryv (oprava/alternativní znění) nad jedním nebo více balíčky. Adresuje se přes ContentId. */
export type Patch =
  | { op: 'replace'; target: ContentId; fields: Record<string, unknown> }
  | { op: 'add'; parent: ContentId; collection: 'abilities' | 'skills'; item: Skill | Ability }
  | { op: 'remove'; target: ContentId }

export interface Overlay {
  format: typeof PACK_FORMAT
  id: string
  name: string
  version: string
  /** ID balíčků, na které se překryv vztahuje */
  appliesTo: string[]
  /** čitelný původ/autor opravy (např. „Hotfix“, „Truhlice – Nogrim“) */
  origin: string
  patches: Patch[]
}
