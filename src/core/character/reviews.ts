// Stav revizí postavy z pohledu hráče: odesláno vypravěči / přijato / zamítnuto (podle jeho odpovědi).
// Ukládá se jen v tomto zařízení; samotný deník se tím nemění.
export type ReviewStatus = 'odeslano' | 'prijato' | 'zamitnuto'

const KEY = (id: string) => `drd2-char-reviews:${id}`
const STATUSES: ReviewStatus[] = ['odeslano', 'prijato', 'zamitnuto']

export interface Reviews {
  /** poslední revize, která už byla odeslána (příští export začne za ní) */
  sentUpTo?: string
  status: Record<string, ReviewStatus>
  /** poznámka z poslední odpovědi vypravěče */
  note?: string
}

export function loadReviews(id: string): Reviews {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY(id)) ?? '{}')
    const status: Record<string, ReviewStatus> = {}
    if (typeof raw.status === 'object' && raw.status !== null)
      for (const [k, v] of Object.entries(raw.status).slice(0, 1000))
        if (STATUSES.includes(v as ReviewStatus)) status[k.slice(0, 100)] = v as ReviewStatus
    return {
      status,
      ...(typeof raw.sentUpTo === 'string' ? { sentUpTo: raw.sentUpTo.slice(0, 100) } : {}),
      ...(typeof raw.note === 'string' ? { note: raw.note.slice(0, 500) } : {}),
    }
  } catch {
    return { status: {} }
  }
}

function save(id: string, r: Reviews) {
  try {
    localStorage.setItem(KEY(id), JSON.stringify(r))
  } catch {
    /* stav revizí je jen pomůcka; bez úložiště se po zavření ztratí */
  }
}

/** Označí revize jako odeslané a posune začátek příštího exportu. */
export function markSent(id: string, revisionIds: string[]) {
  if (!revisionIds.length) return
  const r = loadReviews(id)
  for (const rid of revisionIds) r.status[rid] ??= 'odeslano'
  r.sentUpTo = revisionIds[revisionIds.length - 1]
  save(id, r)
}

/** Zapíše odpověď vypravěče. */
export function recordResponse(id: string, accepted: string[], rejected: string[], note: string) {
  const r = loadReviews(id)
  for (const rid of accepted) r.status[rid] = 'prijato'
  for (const rid of rejected) r.status[rid] = 'zamitnuto'
  r.note = note
  save(id, r)
}
