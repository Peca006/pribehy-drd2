// Sdílení družiny a žurnálu mezi zařízeními (bez serveru). Pravda je u Průvodce:
//  - Průvodce posílá hráčům družinu (členy, poznámky a schválené zápisy žurnálu; hráč si ji uloží jako kopii),
//  - hráč posílá Průvodci své návrhy zápisů, které Průvodce přijme (stanou se zápisem), nebo zamítne
//    (zamítnuté se hráčům vrátí s příští družinou).
// Balíček se přenáší stejně jako postavy (kód `DRD2:…`, soubor, QR). Data z neznámého zdroje se vždy očistí.
import {
  roleOf,
  type EntryStatus,
  type JournalEntry,
  type Member,
  type Party,
  type PartyRole,
} from './model'

export const PARTY_SHARE_VERSION = 1
const MAX_ENTRIES = 300
const MAX_MEMBERS = 40

export interface SharedMember {
  id: string
  name: string
  characterId?: string
}

export interface SharedEntry {
  id: string
  at: string
  edited?: string
  by: string
  title: string
  text: string
  /** zkušenosti rozdané při sezení podle ID členů (u Průvodce) */
  xp?: Record<string, number>
}

export interface PartyBundle {
  v: typeof PARTY_SHARE_VERSION
  type: 'druzina'
  /** kdo balíček posílá */
  from: PartyRole
  author: string
  party: { id: string; name: string; notes: string; members: SharedMember[] }
  journal: SharedEntry[]
  /** ID zamítnutých návrhů (jen od Průvodce) */
  rejected: string[]
}

const stamp = (e: JournalEntry) => e.edited ?? e.at
const approved = (e: JournalEntry) => !e.status

const toShared = (e: JournalEntry): SharedEntry => ({
  id: e.id,
  at: e.at,
  ...(e.edited ? { edited: e.edited } : {}),
  by: e.by,
  title: e.title,
  text: e.text,
  ...(e.session ? { xp: e.session.xp } : {}),
})

/**
 * Průvodce: družina se schválenými zápisy (jen nové nebo změněné po `since`, když je zadáno).
 * Hráč: jen jeho návrhy zápisů čekající na schválení.
 */
export function buildPartyBundle(party: Party, author: string, since?: string | null): PartyBundle {
  const gm = roleOf(party) === 'pruvodce'
  const entries = party.journal
    .filter((e) => (gm ? approved(e) && (!since || stamp(e) > since) : e.status === 'navrh'))
    .map(toShared)
  return {
    v: PARTY_SHARE_VERSION,
    type: 'druzina',
    from: gm ? 'pruvodce' : 'hrac',
    author,
    party: {
      id: party.id,
      name: party.name,
      notes: gm ? party.notes : '',
      members: party.members.map((m) => ({
        id: m.id,
        name: m.name,
        ...(m.characterId ? { characterId: m.characterId } : {}),
      })),
    },
    journal: entries,
    rejected: gm ? [...(party.rejected ?? [])] : [],
  }
}

// --- očištění ---

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : undefined)
const iso = (v: unknown) => {
  const s = str(v, 40)
  return s && !Number.isNaN(Date.parse(s)) ? s : undefined
}

function sanitizeEntry(raw: unknown): SharedEntry | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const r = raw as Record<string, unknown>
  const id = str(r.id, 100)
  const at = iso(r.at)
  if (!id || !at) return undefined
  const xp: Record<string, number> = {}
  if (typeof r.xp === 'object' && r.xp !== null)
    for (const [k, v] of Object.entries(r.xp).slice(0, MAX_MEMBERS))
      if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 100)
        xp[k.slice(0, 100)] = v
  const edited = iso(r.edited)
  return {
    id,
    at,
    ...(edited ? { edited } : {}),
    by: str(r.by, 60) ?? '',
    title: str(r.title, 200) ?? '',
    text: str(r.text, 20000) ?? '',
    ...(Object.keys(xp).length ? { xp } : {}),
  }
}

export function sanitizePartyBundle(raw: unknown): { bundle?: PartyBundle; errors: string[] } {
  const errors: string[] = []
  if (typeof raw !== 'object' || raw === null) return { errors: ['Nejde o balíček družiny.'] }
  const r = raw as Record<string, unknown>
  if (r.v !== PARTY_SHARE_VERSION)
    return { errors: [`Nepodporovaná verze balíčku: ${String(r.v)}`] }
  const p = (typeof r.party === 'object' && r.party !== null ? r.party : {}) as Record<
    string,
    unknown
  >
  const id = str(p.id, 100)
  if (!id) return { errors: ['Balíčku chybí označení družiny.'] }
  const members: SharedMember[] = []
  if (Array.isArray(p.members))
    for (const m of p.members.slice(0, MAX_MEMBERS)) {
      if (typeof m !== 'object' || m === null) continue
      const mm = m as Record<string, unknown>
      const mid = str(mm.id, 100)
      const name = str(mm.name, 200)?.trim()
      if (!mid || !name) continue
      const characterId = str(mm.characterId, 100)
      members.push({ id: mid, name, ...(characterId ? { characterId } : {}) })
    }
  const list = Array.isArray(r.journal) ? r.journal : []
  if (list.length > MAX_ENTRIES) errors.push(`Příliš mnoho zápisů (nejvýš ${MAX_ENTRIES}).`)
  const journal: SharedEntry[] = []
  for (const e of list.slice(0, MAX_ENTRIES)) {
    const s = sanitizeEntry(e)
    if (s) journal.push(s)
    else errors.push('Neplatný zápis byl přeskočen.')
  }
  const rejected = Array.isArray(r.rejected)
    ? r.rejected
        .filter((x): x is string => typeof x === 'string')
        .slice(0, MAX_ENTRIES)
        .map((x) => x.slice(0, 100))
    : []
  return {
    bundle: {
      v: PARTY_SHARE_VERSION,
      type: 'druzina',
      from: r.from === 'hrac' ? 'hrac' : 'pruvodce',
      author: str(r.author, 60) ?? '',
      party: {
        id,
        name: str(p.name, 200)?.trim() || 'Družina',
        notes: str(p.notes, 20000) ?? '',
        members,
      },
      journal,
      rejected,
    },
    errors,
  }
}

// --- slučování ---

export interface MergeReport {
  /** nové zápisy (u hráče schválené, u Průvodce návrhy hráče) */
  added: SharedEntry[]
  /** zápisy, které se změnily proti místní kopii */
  updated: SharedEntry[]
  /** zápisy přeskočené (už schválené u Průvodce, zamítnuté, shodné) */
  ignored: number
  /** nová kopie družiny (u hráče, který ji ještě nemá) */
  created: boolean
}

export interface MergeResult {
  party?: Party
  report: MergeReport
  error?: string
}

const fromShared = (
  e: SharedEntry,
  status: EntryStatus | undefined,
  local?: JournalEntry,
): JournalEntry => ({
  id: e.id,
  at: e.at,
  ...(e.edited ? { edited: e.edited } : {}),
  ...(status ? { status } : {}),
  by: e.by,
  title: e.title,
  text: e.text,
  // zkušenosti jsou součástí zápisu, ale „připsáno“ je vždy jen věc tohoto zařízení
  ...(e.xp ? { session: { xp: e.xp, applied: local?.session?.applied ?? [] } } : {}),
})

const members = (b: PartyBundle): Member[] =>
  b.party.members.map((m) => ({
    id: m.id,
    name: m.name,
    ...(m.characterId ? { characterId: m.characterId } : {}),
  }))

const empty = (): MergeReport => ({ added: [], updated: [], ignored: 0, created: false })

/** Co by se stalo po přijetí balíčku; `party` je výsledek (nic se neukládá), `error` brání přijetí. */
export function mergeIncoming(local: Party | undefined, b: PartyBundle): MergeResult {
  const report = empty()

  if (b.from === 'pruvodce') {
    if (local && roleOf(local) === 'pruvodce')
      return { report, error: 'Tuto družinu vedete vy, přijmout ji od Průvodce nejde.' }
    const base: Party = local ?? {
      id: b.party.id,
      role: 'hrac',
      name: b.party.name,
      notes: '',
      members: [],
      journal: [],
      updated: new Date().toISOString(),
    }
    report.created = !local
    const journal = [...base.journal]
    for (const e of b.journal) {
      const i = journal.findIndex((x) => x.id === e.id)
      if (i < 0) {
        journal.push(fromShared(e, undefined))
        report.added.push(e)
      } else if (
        journal[i].status ||
        stamp(journal[i]) !== (e.edited ?? e.at) ||
        journal[i].text !== e.text ||
        journal[i].title !== e.title
      ) {
        // pravda je u Průvodce: jeho znění vždy nahradí místní (i vlastní návrh se schválením)
        journal[i] = fromShared(e, undefined, journal[i])
        report.updated.push(e)
      } else report.ignored++
    }
    // zamítnuté návrhy se označí
    for (const rid of b.rejected) {
      const i = journal.findIndex((x) => x.id === rid && x.status === 'navrh')
      if (i >= 0) journal[i] = { ...journal[i], status: 'zamitnuto' }
    }
    journal.sort((x, y) => y.at.localeCompare(x.at))
    return {
      report,
      party: {
        ...base,
        name: b.party.name,
        notes: b.party.notes,
        members: members(b),
        journal,
        rejected: b.rejected,
      },
    }
  }

  // od hráče: návrhy zápisů pro Průvodce
  if (!local)
    return { report, error: 'Tuto družinu v zařízení nemáte, návrhy hráče nelze přijmout.' }
  if (roleOf(local) !== 'pruvodce')
    return { report, error: 'Návrhy hráčů přijímá jen Průvodce družiny.' }
  const journal = [...local.journal]
  for (const e of b.journal) {
    const i = journal.findIndex((x) => x.id === e.id)
    if ((local.rejected ?? []).includes(e.id)) report.ignored++
    else if (i < 0) {
      journal.push(fromShared({ ...e, xp: undefined }, 'navrh'))
      report.added.push(e)
    } else if (journal[i].status === 'navrh' && stamp(journal[i]) < (e.edited ?? e.at)) {
      journal[i] = fromShared({ ...e, xp: undefined }, 'navrh')
      report.updated.push(e)
    } else report.ignored++ // schválený zápis hráč měnit nemůže
  }
  journal.sort((x, y) => y.at.localeCompare(x.at))
  return { report, party: { ...local, journal } }
}

/** Průvodce přijme návrh: stane se běžným zápisem a půjde hráčům s příštím odesláním. */
export function approveEntry(p: Party, id: string): Party {
  return {
    ...p,
    journal: p.journal.map((e) => {
      if (e.id !== id || e.status !== 'navrh') return e
      const { status: _status, ...rest } = e
      return { ...rest, edited: new Date().toISOString() }
    }),
  }
}

/** Průvodce zamítne návrh: zápis zmizí a jeho ID se pošle hráčům. */
export function rejectEntry(p: Party, id: string): Party {
  return {
    ...p,
    journal: p.journal.filter((e) => !(e.id === id && e.status === 'navrh')),
    rejected: [...new Set([...(p.rejected ?? []), id])],
  }
}
