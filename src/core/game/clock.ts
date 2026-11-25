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
  /** krátký odpočet pro rychlé reakce (běží nezávisle na hlavní časomíře): délka a okamžik konce, oboje v ms */
  countdown?: { total: number; end: number }
  note?: string
  updated: string
}

const stamp = (s: Sitting): Sitting => ({ ...s, updated: new Date().toISOString() })

export const startSitting = (
  partyId: string,
  now: number,
  runId?: string,
  planned?: number,
): Sitting => ({
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
export const wallClock = (s: Sitting, now: number): number =>
  Math.max(0, (s.ended ?? now) - s.started)

/** Pruhy pro porovnání: podíl času každého člena vůči největšímu (0 až 1), takže všechny pruhy mají stejné měřítko. */
export function bars(
  s: Sitting,
  memberIds: readonly string[],
  now: number,
): Record<string, number> {
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

/** Spravedlivý prostor: kdo je „pozadu“, se ukáže, až když hra trvá aspoň tohle dlouho. */
export const FAIR_MIN_MS = 10 * 60 * 1000
/** Člen je pozadu, když má méně než tento podíl spravedlivého dílu. */
export const FAIR_BEHIND = 0.7

export interface Fairness {
  /** členové ve hře (bez těch, kdo jsou mimo) */
  present: string[]
  /** spravedlivý díl v ms: čas hry členů ve hře dělený jejich počtem */
  share: number
  /** členové ve hře pod prahem, od nejméně času; prázdné, dokud hra netrvá dost dlouho */
  behind: string[]
  /** je hra dost dlouhá na to, aby se upozornění ukazovalo */
  ready: boolean
}

/** Člen je mimo hru (nepočítá se do spravedlivého dílu). Aktivního člena nejdřív pozastaví. */
export function setAbsent(s: Sitting, memberId: string, absent: boolean, now: number): Sitting {
  if (s.status === 'hotovo') return s
  const base = activeMember(s) === memberId ? pause(s, now) : s
  const rest = (base.absent ?? []).filter((x) => x !== memberId)
  return stamp({ ...base, absent: absent ? [...rest, memberId] : rest })
}

/** Spravedlivý díl a upozornění, kdo je pozadu. Čas se bere jen členům ve hře. */
export function fairness(s: Sitting, memberIds: readonly string[], now: number): Fairness {
  const out = new Set(s.absent ?? [])
  const present = memberIds.filter((id) => !out.has(id))
  const t = totals(s, now)
  const sum = present.reduce((a, id) => a + (t[id] ?? 0), 0)
  const share = present.length ? sum / present.length : 0
  const ready = present.length > 1 && sum >= FAIR_MIN_MS
  const behind = ready
    ? present
        .filter((id) => (t[id] ?? 0) < share * FAIR_BEHIND)
        .sort((a, b) => (t[a] ?? 0) - (t[b] ?? 0))
    : []
  return { present, share, behind, ready }
}

/** Nastaví plánovanou délku sezení v minutách; prázdná nebo neplatná hodnota plán zruší. */
export function setPlanned(s: Sitting, minutes: number | undefined): Sitting {
  const { planned: _old, ...rest } = s
  return stamp(minutes && minutes > 0 ? { ...rest, planned: Math.round(minutes) } : rest)
}

/** Přiřadí sezení vedení výpravy (nebo vazbu zruší). */
export function setRun(s: Sitting, runId: string | undefined): Sitting {
  const { runId: _old, ...rest } = s
  return stamp(runId ? { ...rest, runId } : rest)
}

/** Kolik příhod bylo odehráno od `since` (ms); `at` je ISO čas odehrání příhody. */
export function playedSince(
  incidents: Record<string, { state: string; at?: string }>,
  since: number,
): number {
  return Object.values(incidents).filter(
    (i) => i.state === 'odehrana' && i.at !== undefined && Date.parse(i.at) >= since,
  ).length
}

export interface Plan {
  plannedMs: number
  /** zbývá do konce plánu (záporné = plán je překročen) */
  remainingMs: number
  over: boolean
  /** zbývající čas na jednoho člena ve hře */
  perMemberMs: number
  /** průměrná délka odehrané příhody v tomto sezení (od začátku sezení včetně pauz) */
  perIncidentMs?: number
  /** odhad času na zbývající příhody výpravy */
  neededMs?: number
  /** vyjde zbývající příhody při tomto tempu stihnout? */
  fits?: boolean
}

/**
 * Plán podle délky sezení: kolik zbývá celkem a na jednoho. Jsou-li známé odehrané příhody sezení (`played`) a počet
 * zbývajících příhod výpravy (`left`), přidá odhad, jestli je při tomto tempu stihnete. Bez plánu vrací undefined.
 */
export function plan(
  s: Sitting,
  now: number,
  present: number,
  incidents?: { played: number; left: number },
): Plan | undefined {
  if (!s.planned) return undefined
  const plannedMs = s.planned * 60_000
  const remainingMs = plannedMs - wallClock(s, now)
  const over = remainingMs <= 0
  const base: Plan = {
    plannedMs,
    remainingMs,
    over,
    perMemberMs: !over && present > 0 ? remainingMs / present : 0,
  }
  if (incidents && incidents.played > 0) {
    const perIncidentMs = wallClock(s, now) / incidents.played
    const neededMs = perIncidentMs * incidents.left
    return { ...base, perIncidentMs, neededMs, fits: !over && neededMs <= remainingMs }
  }
  return base
}

/** Spustí krátký odpočet (nahradí předchozí). Nezávisí na pauze hlavní časomíry. */
export function startCountdown(s: Sitting, seconds: number, now: number): Sitting {
  const total = Math.round(seconds) * 1000
  if (!(total > 0) || s.status === 'hotovo') return s
  return stamp({ ...s, countdown: { total, end: now + total } })
}

/** Zruší odpočet (nebo ho po vypršení odloží). */
export function clearCountdown(s: Sitting): Sitting {
  if (!s.countdown) return s
  const { countdown: _old, ...rest } = s
  return stamp(rest)
}

/** Kolik ms zbývá do konce odpočtu (0 = vypršel); bez odpočtu undefined. */
export const countdownLeft = (s: Sitting, now: number): number | undefined =>
  s.countdown ? Math.max(0, s.countdown.end - now) : undefined
