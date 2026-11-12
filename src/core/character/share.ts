// Sdílení revizí postavy mezi zařízeními (hráč → vypravěč) bez serveru. Balíček obsahuje jen revize
// (změněné cesty a nové hodnoty), ne celý stav; příjemce si staré hodnoty odvodí ze svého deníku.
// Přenos: stlačený JSON v textovém kódu (`DRD2:…`) nebo soubor. Data z neznámého zdroje se vždy očistí
// (povolené cesty, typy a délky), protože se přijímají od cizího zařízení.
import {
  characterOf,
  emptyCharacter,
  type ChangeEvent,
  type Character,
  type CharacterLog,
} from './model'
import { groupRevisions, type Revision } from './revisions'

export const SHARE_VERSION = 1
const PREFIX = 'DRD2:'
const MAX_REVISIONS = 200
const MAX_EVENTS = 200
const MAX_DECODED = 2_000_000

export interface SharedEvent {
  id: string
  path: string
  value?: unknown
}
export interface SharedRevision {
  id: string
  at: string
  by: string
  note: string
  events: SharedEvent[]
}

/** Revize od hráče (nebo celá postava od začátku, když je `base` null). */
export interface RevisionBundle {
  v: typeof SHARE_VERSION
  type: 'revize'
  char: string
  /** jméno postavy (jen pro zobrazení) */
  name: string
  /** ID revize, na kterou první přiložená revize navazuje (null = od vzniku postavy) */
  base: string | null
  revisions: SharedRevision[]
}

/** Odpověď vypravěče: které revize přijal a které zamítl. */
export interface ReviewBundle {
  v: typeof SHARE_VERSION
  type: 'odpoved'
  char: string
  name: string
  accepted: string[]
  rejected: string[]
  note: string
}

export type Bundle = RevisionBundle | ReviewBundle

// --- sestavení ---

/** Revize po revizi `since` (nebo všechny, když `since` chybí nebo v deníku není). */
export function buildRevisionBundle(
  log: CharacterLog,
  name: string,
  since?: string | null,
): RevisionBundle {
  const all = groupRevisions(log.events)
  const i = since ? all.findIndex((r) => r.id === since) : -1
  const revs = i >= 0 ? all.slice(i + 1) : all
  return {
    v: SHARE_VERSION,
    type: 'revize',
    char: log.id,
    name,
    base: i >= 0 ? all[i].id : null,
    revisions: revs.map((r) => ({
      id: r.id,
      at: r.at,
      by: r.by,
      note: r.note,
      events: r.events.map((e) => ({
        id: e.id,
        path: e.path,
        ...(e.value !== undefined ? { value: e.value } : {}),
      })),
    })),
  }
}

// --- kód (stlačený JSON v base64url) ---

const b64 = (bytes: Uint8Array) => {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const unb64 = (s: string) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

async function pipe(data: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const w = stream.writable.getWriter()
  void w.write(data as BufferSource).catch(() => {})
  void w.close().catch(() => {})
  const reader = stream.readable.getReader()
  const parts: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    if (size > MAX_DECODED) {
      await reader.cancel()
      throw new Error('Data jsou příliš velká.')
    }
    parts.push(value)
  }
  const out = new Uint8Array(size)
  let o = 0
  for (const p of parts) (out.set(p, o), (o += p.length))
  return out
}

/** Text kódu pro balíček: `DRD2:` + stlačený JSON. */
export async function encodeBundle(b: Bundle): Promise<string> {
  const bytes = await pipe(
    new TextEncoder().encode(JSON.stringify(b)),
    new CompressionStream('deflate-raw'),
  )
  return PREFIX + b64(bytes)
}

// --- očištění ---

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : undefined)
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)

const TEXT_PATHS: Record<string, number> = {
  name: 200,
  concept: 1000,
  raceId: 200,
  cultureId: 200,
  weaponKind: 200,
  trait: 1000,
  heroStory: 20000,
  notes: 20000,
}
const LIST_PATHS: Record<string, [number, number]> = {
  abilities: [300, 200],
  equipment: [500, 500],
}
const ATTR = ['Tělo', 'Duše', 'Vliv']

/** Platná změna (cesta i typ hodnoty), jinak `undefined`. */
export function sanitizeEvent(raw: unknown): SharedEvent | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const r = raw as Record<string, unknown>
  const path = str(r.path, 300)
  const id = str(r.id, 100)
  if (!path || !id) return undefined
  const v = r.value
  if (path in TEXT_PATHS) {
    const s = str(v, TEXT_PATHS[path])
    return s === undefined ? undefined : { id, path, value: s }
  }
  if (path in LIST_PATHS) {
    if (!Array.isArray(v)) return undefined
    const [n, len] = LIST_PATHS[path]
    return {
      id,
      path,
      value: v
        .filter((x): x is string => typeof x === 'string')
        .slice(0, n)
        .map((x) => x.slice(0, len)),
    }
  }
  if (path === 'cash') {
    const n = num(v)
    return n === undefined || n < 0 ? undefined : { id, path, value: n }
  }
  if (path.startsWith('attributes.')) {
    const n = num(v)
    return ATTR.includes(path.slice(11)) && n !== undefined ? { id, path, value: n } : undefined
  }
  if (path.startsWith('professions.') && path.length > 12) {
    if (v === undefined || v === null) return { id, path }
    const n = num(v)
    return n === undefined ? undefined : { id, path, value: n }
  }
  return undefined
}

function sanitizeRevision(raw: unknown, errors: string[]): SharedRevision | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const r = raw as Record<string, unknown>
  const id = str(r.id, 100)
  const at = str(r.at, 40)
  if (!id || !at || Number.isNaN(Date.parse(at))) return undefined
  const events: SharedEvent[] = []
  if (Array.isArray(r.events))
    for (const e of r.events.slice(0, MAX_EVENTS)) {
      const ev = sanitizeEvent(e)
      if (ev) events.push(ev)
      else errors.push(`Revize „${str(r.note, 60) ?? id}“: neplatná změna byla vynechána.`)
    }
  if (!events.length) return undefined
  return { id, at, by: str(r.by, 60) ?? '', note: str(r.note, 200) ?? '', events }
}

export function sanitizeBundle(raw: unknown): { bundle?: Bundle; errors: string[] } {
  const errors: string[] = []
  if (typeof raw !== 'object' || raw === null) return { errors: ['Nejde o balíček postavy.'] }
  const r = raw as Record<string, unknown>
  if (r.v !== SHARE_VERSION) return { errors: [`Nepodporovaná verze balíčku: ${String(r.v)}`] }
  const char = str(r.char, 100)
  if (!char) return { errors: ['Balíčku chybí označení postavy.'] }
  const name = str(r.name, 200) ?? ''
  if (r.type === 'odpoved') {
    const ids = (v: unknown) =>
      Array.isArray(v)
        ? v
            .filter((x): x is string => typeof x === 'string')
            .slice(0, MAX_REVISIONS)
            .map((x) => x.slice(0, 100))
        : []
    return {
      bundle: {
        v: SHARE_VERSION,
        type: 'odpoved',
        char,
        name,
        accepted: ids(r.accepted),
        rejected: ids(r.rejected),
        note: str(r.note, 500) ?? '',
      },
      errors,
    }
  }
  if (r.type !== 'revize') return { errors: ['Neznámý druh balíčku.'] }
  if (!Array.isArray(r.revisions)) return { errors: ['Balíček neobsahuje žádné revize.'] }
  if (r.revisions.length > MAX_REVISIONS)
    errors.push(`Příliš mnoho revizí (nejvýš ${MAX_REVISIONS}).`)
  const revisions = r.revisions
    .slice(0, MAX_REVISIONS)
    .map((x) => sanitizeRevision(x, errors))
    .filter((x): x is SharedRevision => !!x)
  if (!revisions.length) return { errors: [...errors, 'Balíček neobsahuje použitelné revize.'] }
  return {
    bundle: {
      v: SHARE_VERSION,
      type: 'revize',
      char,
      name,
      base: str(r.base, 100) ?? null,
      revisions,
    },
    errors,
  }
}

/** Přečte kód `DRD2:…` nebo holý JSON a očistí ho. */
export async function decodeBundle(text: string): Promise<{ bundle?: Bundle; errors: string[] }> {
  const t = text.trim()
  let json: string
  try {
    if (t.startsWith(PREFIX)) {
      const bytes = await pipe(
        unb64(t.slice(PREFIX.length).replace(/\s+/g, '')),
        new DecompressionStream('deflate-raw'),
      )
      json = new TextDecoder().decode(bytes)
    } else json = t
    return sanitizeBundle(JSON.parse(json))
  } catch (e) {
    return {
      errors: [
        e instanceof Error && e.message.startsWith('Data jsou')
          ? e.message
          : 'Kód nelze přečíst (poškozený nebo neúplný).',
      ],
    }
  }
}

// --- analýza a přijetí ---

export type ImportKind = 'nova-postava' | 'navazuje' | 'jiny-stav' | 'neznamy-zaklad' | 'nic-noveho'

export interface ImportAnalysis {
  kind: ImportKind
  /** revize, které v deníku ještě nejsou */
  fresh: SharedRevision[]
  /** cesty, které se změnily jak v příchozích revizích, tak v místních revizích po základu */
  conflicts: string[]
}

const pathsOf = (events: { path: string }[]) => new Set(events.map((e) => e.path))

export function analyzeImport(log: CharacterLog | undefined, b: RevisionBundle): ImportAnalysis {
  if (!log) return { kind: 'nova-postava', fresh: b.revisions, conflicts: [] }
  const mine = groupRevisions(log.events)
  const have = new Set(mine.map((r) => r.id))
  const fresh = b.revisions.filter((r) => !have.has(r.id))
  if (!fresh.length) return { kind: 'nic-noveho', fresh, conflicts: [] }
  const last = mine[mine.length - 1]?.id ?? null
  if (b.base === last) return { kind: 'navazuje', fresh, conflicts: [] }
  const at = b.base === null ? -1 : mine.findIndex((r) => r.id === b.base)
  if (b.base !== null && at < 0) return { kind: 'neznamy-zaklad', fresh, conflicts: [] }
  // místní revize po základu (které hráč neposílá) se mohou překrývat s příchozími změnami
  const local = mine.slice(at + 1).filter((r) => !b.revisions.some((x) => x.id === r.id))
  const localPaths = pathsOf(local.flatMap((r) => r.events))
  const conflicts = [...pathsOf(fresh.flatMap((r) => r.events))].filter((p) => localPaths.has(p))
  return { kind: 'jiny-stav', fresh, conflicts }
}

/** Přidá vybrané revize do deníku (nová postava = nový deník); ostatní se přeskočí. */
export function applyRevisions(
  log: CharacterLog | undefined,
  bundle: RevisionBundle,
  accepted: Set<string>,
): CharacterLog {
  const out: CharacterLog = log
    ? { ...log, events: [...log.events] }
    : { id: bundle.char, events: [] }
  const have = new Set(out.events.map((e) => e.id))
  for (const r of bundle.revisions) {
    if (!accepted.has(r.id)) continue
    for (const e of r.events) {
      if (have.has(e.id)) continue
      const ev: ChangeEvent = {
        id: e.id,
        at: r.at,
        by: r.by,
        note: r.note,
        rev: r.id,
        path: e.path,
        value: e.value,
      }
      out.events.push(ev)
    }
  }
  return out
}

/** Postava, jak by vypadala po přijetí vybraných revizí (pro náhled). */
export function previewAfter(
  log: CharacterLog | undefined,
  bundle: RevisionBundle,
  accepted: Set<string>,
): Character {
  const next = applyRevisions(log, bundle, accepted)
  return characterOf({ id: next.id, events: next.events }) ?? emptyCharacter(bundle.char)
}
