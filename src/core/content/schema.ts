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

export interface ContentPack {
  manifest: PackManifest
  chapters?: Chapter[]
  professions: Profession[]
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
