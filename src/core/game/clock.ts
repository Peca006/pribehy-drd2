// Vedení hry: časomíra sezení (kolik času měl který hráč). Čistá logika bez úložiště a bez časovačů:
// všechny součty se počítají z časových razítek (ms), takže přežijí uspání telefonu i obnovení stránky.
import { newId } from '../character/model'

export type SittingStatus = 'bezi' | 'pauza' | 'hotovo'

/** Úsek, kdy byl aktivní člen družiny; poslední úsek bez `to` právě běží. */
export interface Span {
  memberId: string
  from: number
  to?: number
}

export interface Sitting {
  id: string
  partyId: string
  /** vedení výpravy, ke kterému sezení patří (nepovinné) */
  runId?: string
  status: SittingStatus
  started: number
  ended?: number
  spans: Span[]
  /** naposledy aktivní člen (pro „Pokračovat“ po pauze) */
  current?: string
  /** členové mimo hru (nepočítají se do spravedlivého dílu) */
  absent?: string[]
  /** plánovaná délka sezení v minutách */
  planned?: number
  note?: string
  updated: string
}

const stamp = (s: Sitting): Sitting => ({ ...s, updated: new Date().toISOString() })

export const startSitting = (partyId: string, now: number, runId?: string, planned?: number): Sitting => ({
  id: newId(),
  partyId,
  ...(runId ? { runId } : {}),
  status: 'pauza',
  started: now,
  spans: [],
  ...(planned ? { planned } : {}),
  updated: new Date(now).toISOString(),
})

/** Aktivní (právě běžící) úsek. */
export const activeSpan = (s: Sitting): Span | undefined => {
  const last = s.spans[s.spans.length - 1]
  return last && last.to === undefined ? last : undefined
}

/** Právě aktivní člen (jen když sezení běží). */
export const activeMember = (s: Sitting): string | undefined =>
  s.status === 'bezi' ? activeSpan(s)?.memberId : undefined

function close(s: Sitting, now: number): Span[] {
  const open = activeSpan(s)
  if (!open) return s.spans
  return [...s.spans.slice(0, -1), { ...open, to: Math.max(now, open.from) }]
}

/** Aktivuje člena (předchozího zastaví); klepnutí na už aktivního člena sezení pozastaví. Hotové sezení se nemění. */
export function activate(s: Sitting, memberId: string, now: number): Sitting {
  if (s.status === 'hotovo') return s
  if (activeMember(s) === memberId) return pause(s, now)
  return stamp({
    ...s,
    status: 'bezi',
    current: memberId,
    spans: [...close(s, now), { memberId, from: now }],
    absent: (s.absent ?? []).filter((x) => x !== memberId),
  })
}

/** Pozastaví časomíru (nikdo není aktivní). */
export function pause(s: Sitting, now: number): Sitting {
  if (s.status !== 'bezi') return s
  return stamp({ ...s, status: 'pauza', spans: close(s, now) })
}

/** Pokračuje po pauze s naposledy aktivním členem; bez něj jen vrací sezení beze změny. */
export function resume(s: Sitting, now: number): Sitting {
  if (s.status !== 'pauza' || !s.current) return s
  return activate(s, s.current, now)
}

/** Ukončí sezení (rozběhnutý úsek se uzavře). */
export function finish(s: Sitting, now: number): Sitting {
  if (s.status === 'hotovo') return s
  return stamp({ ...s, status: 'hotovo', ended: now, spans: close(s, now) })
}

/** Čas každého člena v ms k okamžiku `now` (u hotového sezení k jeho konci). */
export function totals(s: Sitting, now: number): Record<string, number> {
  const end = s.ended ?? now
  const out: Record<string, number> = {}
  for (const sp of s.spans) {
    const to = sp.to ?? end
    out[sp.memberId] = (out[sp.memberId] ?? 0) + Math.max(0, to - sp.from)
  }
  return out
}

/** Čas hry celkem (součet všech členů, bez pauz). */
export const elapsed = (s: Sitting, now: number): number =>
  Object.values(totals(s, now)).reduce((a, b) => a + b, 0)

/** Čas od začátku sezení včetně pauz. */
export const wallClock = (s: Sitting, now: number): number => Math.max(0, (s.ended ?? now) - s.started)

/** Pruhy pro porovnání: podíl času každého člena vůči největšímu (0 až 1), takže všechny pruhy mají stejné měřítko. */
export function bars(s: Sitting, memberIds: readonly string[], now: number): Record<string, number> {
  const t = totals(s, now)
  const max = Math.max(0, ...memberIds.map((id) => t[id] ?? 0))
  return Object.fromEntries(memberIds.map((id) => [id, max ? (t[id] ?? 0) / max : 0]))
}

/** Čas jako `m:ss` (nebo `h:mm:ss` od hodiny). */
export function formatClock(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const sec = String(total % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}
