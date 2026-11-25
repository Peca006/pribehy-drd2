// Záloha všech dat uživatele do jednoho souboru `.json` a obnova z něj. Formát je popsaný v `FORMAT.md`.
//
// Záloha nese záznamy tak, jak jsou uložené (i s číslem `schema`), takže import je převede na aktuální schéma
// stejným řetězcem migrací jako čtení z úložiště. Soubor je čitelný a nezávislý na prohlížeči. Obsahové balíčky
// (pravidla, bestiář) se nezálohují: stáhnou se znovu. Import soubor vždy očistí (je to vstup z vnějšku).
import { migrateRecord, rawRecords, repo, run, schemaOf, type DataStore } from './db'
import { fromBase64, toBase64 } from './character/imageFile'
import { sanitizeEvent } from './character/share'

export const BACKUP_FORMAT = 'drd2-zaloha'
/** Číslo formátu souboru zálohy; zvyšuje se jen při změně jeho struktury (ne při změně schématu záznamů). */
export const BACKUP_VERSION = 1

const MAX_TEXT = 200_000_000
const MAX_IMAGE_CHARS = 6_000_000
const MAX_IMAGES = 3000
const MAX_LOCAL_VALUE = 500_000
const IMAGE_MIMES = ['image/webp', 'image/png', 'image/jpeg']

export const RECORD_STORES = [
  'characters',
  'parties',
  'creatures',
  'recipes',
  'adventures',
  'expeditions',
  'runs',
  'sittings',
] as const satisfies readonly DataStore[]
type RecordStore = (typeof RECORD_STORES)[number]

/** Místní stav v `localStorage`, který patří k datům (rozpracované úpravy, zdroje, nastavení…). */
export const LOCAL_KEYS = ['drd2-settings', 'drd2-creator-draft']
export const LOCAL_PREFIXES = [
  'drd2-char-draft:',
  'drd2-char-play:',
  'drd2-char-bonus:',
  'drd2-char-threat:',
  'drd2-char-adv:',
  'drd2-char-reviews:',
  'drd2-conflict:',
]
const isLocalKey = (k: string) => LOCAL_KEYS.includes(k) || LOCAL_PREFIXES.some((p) => k.startsWith(p))

export interface BackupImage {
  id: string
  /** ID postavy, resp. bytosti, ke které obrázek patří */
  owner: string
  added: number
  mime: string
  /** base64 */
  data: string
}

type Rec = Record<string, unknown> & { id: string }

export interface Backup {
  format: typeof BACKUP_FORMAT
  v: number
  /** kdy a jakou verzí aplikace byla záloha vytvořena (jen informativně) */
  created: string
  app: string
  /** čísla schémat záznamů v době zálohy (informativně; každý záznam nese i své) */
  schemas: Record<RecordStore, number>
  characters: Rec[]
  parties: Rec[]
  creatures: Rec[]
  recipes: Rec[]
  adventures: Rec[]
  expeditions: Rec[]
  runs: Rec[]
  sittings: Rec[]
  images: { characters: BackupImage[]; creatures: BackupImage[] }
  local: Record<string, string>
}

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'length' | 'key'>
const defaultStorage = (): KeyValueStorage | undefined =>
  typeof localStorage === 'undefined' ? undefined : localStorage

function localKeys(storage: KeyValueStorage): string[] {
  const out: string[] = []
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i)
    if (k && isLocalKey(k)) out.push(k)
  }
  return out.sort()
}

async function imagesOf(store: 'characterImages' | 'creatureImages', ownerField: 'characterId' | 'creatureId') {
  const all = await run<Record<string, unknown>[]>(store, 'readonly', (s) => s.getAll())
  const out: BackupImage[] = []
  for (const i of all) {
    const blob = i.blob
    if (!(blob instanceof Blob) || typeof i.id !== 'string' || typeof i[ownerField] !== 'string') continue
    out.push({
      id: i.id,
      owner: i[ownerField] as string,
      added: typeof i.added === 'number' ? i.added : 0,
      mime: blob.type || 'image/webp',
      data: toBase64(new Uint8Array(await blob.arrayBuffer())),
    })
  }
  return out.sort((a, b) => a.added - b.added)
}

export interface BuildOptions {
  /** přiložit ilustrace postav a bytostí (soubor bývá o to větší) */
  withImages?: boolean
  storage?: KeyValueStorage
}

export async function buildBackup({ withImages = true, storage = defaultStorage() }: BuildOptions = {}): Promise<Backup> {
  const recs = async (s: RecordStore) => (await rawRecords(s)).filter((r): r is Rec => typeof r.id === 'string')
  const local: Record<string, string> = {}
  if (storage) for (const k of localKeys(storage)) local[k] = storage.getItem(k) ?? ''
  return {
    format: BACKUP_FORMAT,
    v: BACKUP_VERSION,
    created: new Date().toISOString(),
    app: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '',
    schemas: Object.fromEntries(RECORD_STORES.map((s) => [s, schemaOf(s)])) as Record<RecordStore, number>,
    characters: await recs('characters'),
    parties: await recs('parties'),
    creatures: await recs('creatures'),
    recipes: await recs('recipes'),
    adventures: await recs('adventures'),
    expeditions: await recs('expeditions'),
    runs: await recs('runs'),
    sittings: await recs('sittings'),
    images: withImages
      ? { characters: await imagesOf('characterImages', 'characterId'), creatures: await imagesOf('creatureImages', 'creatureId') }
      : { characters: [], creatures: [] },
    local,
  }
}

export const backupFileName = (d = new Date()) => `drd2-zaloha-${d.toISOString().slice(0, 10)}.json`

// --- čtení a očištění ---

const str = (v: unknown, max: number): string | undefined =>
  typeof v === 'string' && v.length <= max ? v : undefined
const obj = (v: unknown): Record<string, unknown> | undefined =>
  typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined

/** Co se při čtení souboru vyřadilo (a proč), aby to šlo uživateli ukázat. */
export interface Dropped {
  records: number
  events: number
  images: number
  local: number
  /** záznamy uložené novější verzí aplikace, než je tato */
  newer: number
}

function sanitizeRecord(store: RecordStore, raw: unknown, dropped: Dropped): Rec | undefined {
  const r = obj(raw)
  const id = str(r?.id, 100)
  if (!r || !id) return void dropped.records++
  if (typeof r.schema === 'number' && r.schema > schemaOf(store)) return void dropped.newer++
  switch (store) {
    case 'characters': {
      if (!Array.isArray(r.events)) return void dropped.records++
      const events: unknown[] = []
      for (const e of r.events) {
        const s = sanitizeEvent(e)
        const o = obj(e)
        if (!s || !o) {
          dropped.events++
          continue
        }
        events.push({
          id: s.id,
          at: str(o.at, 40) ?? '',
          by: str(o.by, 100) ?? '',
          path: s.path,
          ...('value' in s ? { value: s.value } : {}),
          ...(str(o.note, 500) ? { note: o.note } : {}),
          ...(str(o.rev, 100) ? { rev: o.rev } : {}),
        })
      }
      return { id, schema: r.schema, events }
    }
    case 'parties':
      if (typeof r.name !== 'string' || !Array.isArray(r.members) || !Array.isArray(r.journal)) return void dropped.records++
      return { ...r, id }
    case 'creatures':
      if (typeof r.name !== 'string') return void dropped.records++
      return { ...r, id }
    case 'recipes':
      if (typeof r.name !== 'string' || typeof r.kind !== 'string') return void dropped.records++
      return { ...r, id }
    case 'adventures':
      if (typeof r.name !== 'string' || !Array.isArray(r.expeditionIds)) return void dropped.records++
      return { ...r, id }
    case 'expeditions':
      if (typeof r.name !== 'string' || !Array.isArray(r.nodes) || !Array.isArray(r.incidents)) return void dropped.records++
      return { ...r, id }
    case 'sittings':
      if (typeof r.partyId !== 'string' || !Array.isArray(r.spans) || typeof r.started !== 'number') return void dropped.records++
      return { ...r, id }
    case 'runs':
      if (typeof r.partyId !== 'string' || typeof r.expeditionId !== 'string' || !obj(r.incidents)) return void dropped.records++
      return { ...r, id }
  }
}

function sanitizeImages(raw: unknown, dropped: Dropped): BackupImage[] {
  if (!Array.isArray(raw)) return []
  const out: BackupImage[] = []
  for (const x of raw) {
    const o = obj(x)
    const id = str(o?.id, 100)
    const owner = str(o?.owner, 100)
    const mime = str(o?.mime, 30)
    const data = str(o?.data, MAX_IMAGE_CHARS)
    if (!o || !id || !owner || !mime || !IMAGE_MIMES.includes(mime) || !data || !/^[A-Za-z0-9+/]+={0,2}$/.test(data) || out.length >= MAX_IMAGES) {
      dropped.images++
      continue
    }
    out.push({ id, owner, mime, data, added: typeof o.added === 'number' && Number.isFinite(o.added) ? o.added : 0 })
  }
  return out
}

export interface ParsedBackup {
  backup?: Backup
  errors: string[]
  dropped: Dropped
}

/** Přečte a očistí soubor zálohy. Bez `backup` je v `errors` důvod, proč ho nelze použít. */
export function parseBackup(text: string): ParsedBackup {
  const dropped: Dropped = { records: 0, events: 0, images: 0, local: 0, newer: 0 }
  const fail = (e: string): ParsedBackup => ({ errors: [e], dropped })
  if (text.length > MAX_TEXT) return fail('Soubor je příliš velký.')
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return fail('Soubor není platný JSON, nejspíš to není záloha z aplikace.')
  }
  const o = obj(raw)
  if (!o || o.format !== BACKUP_FORMAT) return fail('Soubor není záloha dat z této aplikace.')
  if (typeof o.v !== 'number' || o.v < 1) return fail('Záloha nemá platné číslo formátu.')
  if (o.v > BACKUP_VERSION)
    return fail(`Záloha má formát ${o.v}, tato aplikace zná jen ${BACKUP_VERSION}. Obnovte aplikaci a zkuste to znovu.`)
  const list = (s: RecordStore) =>
    (Array.isArray(o[s]) ? (o[s] as unknown[]) : [])
      .map((r) => sanitizeRecord(s, r, dropped))
      .filter((r): r is Rec => !!r)
  const images = obj(o.images)
  const local: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj(o.local) ?? {})) {
    if (isLocalKey(k) && typeof v === 'string' && v.length <= MAX_LOCAL_VALUE) local[k] = v
    else dropped.local++
  }
  const backup: Backup = {
    format: BACKUP_FORMAT,
    v: o.v,
    created: str(o.created, 40) ?? '',
    app: str(o.app, 40) ?? '',
    schemas: obj(o.schemas) as Backup['schemas'],
    characters: list('characters'),
    parties: list('parties'),
    creatures: list('creatures'),
    recipes: list('recipes'),
    adventures: list('adventures'),
    expeditions: list('expeditions'),
    runs: list('runs'),
    sittings: list('sittings'),
    images: {
      characters: sanitizeImages(images?.characters, dropped),
      creatures: sanitizeImages(images?.creatures, dropped),
    },
    local,
  }
  return { backup, errors: [], dropped }
}

export interface BackupSummary {
  characters: number
  parties: number
  creatures: number
  recipes: number
  adventures: number
  expeditions: number
  runs: number
  sittings: number
  images: number
}

export const summarize = (b: Backup): BackupSummary => ({
  characters: b.characters.length,
  parties: b.parties.length,
  creatures: b.creatures.length,
  recipes: b.recipes.length,
  adventures: b.adventures.length,
  expeditions: b.expeditions.length,
  runs: b.runs.length,
  sittings: b.sittings.length,
  images: b.images.characters.length + b.images.creatures.length,
})

// --- obnova ---

/** `doplnit` = přidá jen to, co v zařízení chybí (nic se nepřepíše); `prepsat` = stejná ID se přepíšou zálohou. */
export type RestoreMode = 'doplnit' | 'prepsat'

export interface RestoreResult {
  /** přidané záznamy a obrázky podle druhu */
  added: BackupSummary
  /** záznamy se stejným ID, které se v režimu „doplnit“ nechaly být */
  kept: number
  /** přepsané záznamy (režim „přepsat“) */
  replaced: number
}

export async function restoreBackup(
  b: Backup,
  mode: RestoreMode,
  storage: KeyValueStorage | undefined = defaultStorage(),
): Promise<RestoreResult> {
  const result: RestoreResult = {
    added: { characters: 0, parties: 0, creatures: 0, recipes: 0, adventures: 0, expeditions: 0, runs: 0, sittings: 0, images: 0 },
    kept: 0,
    replaced: 0,
  }
  const ids = {} as Record<RecordStore, Set<string>>
  for (const s of RECORD_STORES) {
    const r = repo<Rec>(s)
    const have = new Set((await rawRecords(s)).map((x) => x.id as string))
    for (const rec of b[s]) {
      const exists = have.has(rec.id)
      if (exists && mode === 'doplnit') {
        result.kept++
        continue
      }
      const { schema: _schema, ...migrated } = migrateRecord(s, rec)
      await r.put(migrated as Rec)
      have.add(rec.id)
      if (exists) result.replaced++
      else result.added[s]++
    }
    ids[s] = have
  }
  const putImages = async (
    store: 'characterImages' | 'creatureImages',
    field: 'characterId' | 'creatureId',
    owners: Set<string>,
    list: BackupImage[],
  ) => {
    const have = new Set((await run<Record<string, unknown>[]>(store, 'readonly', (s) => s.getAll())).map((x) => x.id))
    for (const i of list) {
      if (!owners.has(i.owner) || (have.has(i.id) && mode === 'doplnit')) continue
      let bytes: Uint8Array
      try {
        bytes = fromBase64(i.data)
      } catch {
        continue
      }
      await run(store, 'readwrite', (s) =>
        s.put({ id: i.id, [field]: i.owner, blob: new Blob([bytes as BlobPart], { type: i.mime }), added: i.added }),
      )
      if (!have.has(i.id)) result.added.images++
    }
  }
  // obrázky bytostí patří i k bytostem z knih (ty v úložišti uživatele nejsou), proto se u nich vlastník nekontroluje
  await putImages('characterImages', 'characterId', ids.characters, b.images.characters)
  await putImages('creatureImages', 'creatureId', new Set(b.images.creatures.map((i) => i.owner)), b.images.creatures)
  if (storage)
    for (const [k, v] of Object.entries(b.local)) if (mode === 'prepsat' || storage.getItem(k) === null) storage.setItem(k, v)
  return result
}
