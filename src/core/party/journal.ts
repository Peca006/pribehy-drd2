// Žurnál a členové družiny: čisté operace nad družinou (logika zobrazení PartyView a Conflict).
import { characterOf, eventsFor, type CharacterLog, type ChangeEvent } from '../character/model'
import { newPartyId, type JournalEntry, type Member, type Party } from './model'

/** Přidá člena s postavou z tohoto zařízení. */
export function addLocalMember(p: Party, characterId: string, name: string): Party {
  return { ...p, members: [...p.members, { id: newPartyId(), name: name || 'Postava', characterId }] }
}

/** Přidá člena jen se jménem (postava je u hráče). Prázdné jméno nic nepřidá. */
export function addFreeMember(p: Party, name: string): Party {
  const n = name.trim()
  return n ? { ...p, members: [...p.members, { id: newPartyId(), name: n }] } : p
}

export const removeMember = (p: Party, memberId: string): Party => ({
  ...p,
  members: p.members.filter((m) => m.id !== memberId),
})

/** Nový zápis do žurnálu; zápis hráče je návrh ke schválení Průvodcem. Prázdný zápis vrací `undefined`. */
export function newEntry(
  author: string,
  gm: boolean,
  title: string,
  text: string,
  at = new Date().toISOString(),
): JournalEntry | undefined {
  const t = title.trim()
  const x = text.trim()
  if (!t && !x) return undefined
  return { id: newPartyId(), at, by: author, ...(gm ? {} : { status: 'navrh' as const }), title: t || 'Zápis', text: x }
}

/** Hráč smí měnit a mazat jen vlastní návrhy; Průvodce všechno. */
export const canChange = (gm: boolean, e: JournalEntry): boolean =>
  gm || e.status === 'navrh' || e.status === 'zamitnuto'

/** Upravený zápis: zamítnutý návrh jde po úpravě znovu ke schválení. */
export function editedEntry(e: JournalEntry, at = new Date().toISOString()): JournalEntry {
  return { ...e, edited: at, ...(e.status === 'zamitnuto' ? { status: 'navrh' as const } : {}) }
}

export const withEntry = (p: Party, e: JournalEntry): Party => ({ ...p, journal: [e, ...p.journal] })

export const withoutEntry = (p: Party, entryId: string): Party => ({
  ...p,
  journal: p.journal.filter((x) => x.id !== entryId),
})

/** Zápis o ukončeném konfliktu. */
export const conflictEntry = (author: string, text: string, at = new Date().toISOString()): JournalEntry => ({
  id: newPartyId(),
  at,
  by: author,
  title: 'Konflikt',
  text,
})

export type XpGrant =
  | { ok: true; events: ChangeEvent[]; xp: number }
  | { ok: false; reason: 'bez-postavy' | 'uz-pripsano' | 'zadne-body' }

/** Události pro připsání bodů ze sezení postavě člena (jednou na člena). */
export function xpGrant(e: JournalEntry, m: Member, log: CharacterLog | undefined, author: string): XpGrant {
  if (!e.session || !m.characterId) return { ok: false, reason: 'bez-postavy' }
  if (e.session.applied.includes(m.id)) return { ok: false, reason: 'uz-pripsano' }
  const xp = e.session.xp[m.id]
  if (!log || !xp) return { ok: false, reason: 'bez-postavy' }
  const before = characterOf(log)
  const events = eventsFor(before, { ...before, xp: before.xp + xp }, author, `Zkušenosti za sezení „${e.title}“ (+${xp})`)
  return { ok: true, events, xp }
}

/** Označí body členovi jako připsané. */
export const markApplied = (e: JournalEntry, memberId: string): JournalEntry =>
  e.session ? { ...e, session: { ...e.session, applied: [...e.session.applied, memberId] } } : e

