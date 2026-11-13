// Pomůcka vypravěče pro konflikt: účastníci (hrdinové z družiny a bytosti), iniciativa, kola, Ohrožení, Výhody a u bytostí
// Sudba a Jizvy proti hranicím vlastností. Stav konfliktu se drží jen v tomto zařízení (u družiny), konec ho smaže.
import { ATTRIBUTES } from '../character/model'
import type { Attribute, Creature } from '../content/schema'

export interface Participant {
  id: string
  name: string
  kind: 'hrdina' | 'bytost'
  /** ID bytosti z Bestiáře */
  creatureId?: string
  /** úroveň k hodům (charakteristika bytosti), je-li známa */
  level?: number
  /** zbývající Sudba bytosti a její výchozí hodnota */
  fate?: number
  fateMax?: number
  /** hranice vlastností bytosti; součet závažností Jizev nad hranicí = vyřazena */
  limits?: Partial<Record<Attribute, number>>
  scars: Record<Attribute, number>
  threat: number
  advantage: number
  initiative: number
  /** už v tomto kole jednal z iniciativy */
  acted: boolean
  out: boolean
  note: string
}

export interface Conflict {
  round: number
  participants: Participant[]
}

export const MIN_THREAT = 1
export const MAX_THREAT = 20

export const emptyConflict = (): Conflict => ({ round: 1, participants: [] })
const noScars = (): Record<Attribute, number> => ({ Tělo: 0, Duše: 0, Vliv: 0 })

let counter = 0
const newId = () =>
  `${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 5)}`

export const hero = (name: string): Participant => ({
  id: newId(),
  name,
  kind: 'hrdina',
  scars: noScars(),
  threat: MIN_THREAT,
  advantage: 0,
  initiative: 0,
  acted: false,
  out: false,
  note: '',
})

/** Účastník z karty bytosti: charakteristika (horní mez) jako úroveň, Sudba a hranice vlastností. */
export function fromCreature(c: Creature): Participant {
  return {
    ...hero(c.name),
    kind: 'bytost',
    creatureId: c.id,
    level: c.characteristic?.max,
    fate: c.fate,
    fateMax: c.fate,
    limits: c.limits ? { ...c.limits } : undefined,
  }
}

export const clampThreat = (n: number) => Math.min(MAX_THREAT, Math.max(MIN_THREAT, Math.floor(n)))

/** Vlastnosti, u nichž součet závažností Jizev přesáhl hranici bytosti. */
export function overLimit(p: Participant): Attribute[] {
  return ATTRIBUTES.filter((a) => {
    const lim = p.limits?.[a]
    return lim !== undefined && p.scars[a] > lim
  })
}

/** Pořadí hlášení akcí: vyšší iniciativa dřív, vyřazení nakonec; shoda zachová pořadí přidání. */
export function ordered(c: Conflict): Participant[] {
  return c.participants
    .map((p, i) => ({ p, i }))
    .sort(
      (x, y) => Number(x.p.out) - Number(y.p.out) || y.p.initiative - x.p.initiative || x.i - y.i,
    )
    .map((x) => x.p)
}

/** Další kolo: číslo se zvýší a všichni mohou znovu jednat z iniciativy. */
export const nextRound = (c: Conflict): Conflict => ({
  round: c.round + 1,
  participants: c.participants.map((p) => ({ ...p, acted: false })),
})

export const update = (c: Conflict, id: string, patch: Partial<Participant>): Conflict => ({
  ...c,
  participants: c.participants.map((p) => (p.id === id ? { ...p, ...patch } : p)),
})

/** Shrnutí konfliktu do žurnálu. */
export function summary(c: Conflict): string {
  const out = c.participants.filter((p) => p.out).map((p) => p.name)
  const left = c.participants.filter((p) => !p.out).map((p) => p.name)
  const rounds = `Konflikt trval ${c.round} ${c.round === 1 ? 'kolo' : c.round < 5 ? 'kola' : 'kol'}.`
  return [
    rounds,
    `Účastníci: ${c.participants.map((p) => p.name).join(', ') || '(nikdo)'}.`,
    out.length ? `Vyřazeni: ${out.join(', ')}.` : 'Nikdo nebyl vyřazen.',
    left.length ? `Zůstali: ${left.join(', ')}.` : '',
  ]
    .filter(Boolean)
    .join(' ')
}

const KEY = (partyId: string) => `drd2-conflict:${partyId}`

export function loadConflict(partyId: string): Conflict {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY(partyId)) ?? 'null')
    if (raw && Array.isArray(raw.participants) && typeof raw.round === 'number')
      return raw as Conflict
  } catch {
    /* nový konflikt */
  }
  return emptyConflict()
}

export function saveConflict(partyId: string, c: Conflict) {
  try {
    if (c.participants.length) localStorage.setItem(KEY(partyId), JSON.stringify(c))
    else localStorage.removeItem(KEY(partyId))
  } catch {
    /* konflikt platí aspoň do zavření stránky */
  }
}

/** Přidá účastníka do uloženého konfliktu družiny (např. z karty bytosti). */
export function addToConflict(partyId: string, p: Participant) {
  const c = loadConflict(partyId)
  saveConflict(partyId, { ...c, participants: [...c.participants, p] })
}
