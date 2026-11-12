// Zhuštění historie pro QR: když se kód s celou historií nevejde do zvoleného počtu QR, starší revize
// od začátku se sloučí do jedné výchozí revize („stav k revizi N“) a novější na ni navazují. Jen pro přenos,
// místní deník zůstává celý. Příjemce s plnou historií podle otisku ověří, že stav souhlasí.
import { characterOf, emptyCharacter, eventsFor, type CharacterLog } from './model'
import { QR_CHUNK } from './qr'
import { groupRevisions, type Revision } from './revisions'
import {
  buildRevisionBundle,
  encodeBundle,
  SHARE_VERSION,
  stateHash,
  type RevisionBundle,
  type SharedRevision,
} from './share'

const shared = (r: Revision): SharedRevision => ({
  id: r.id,
  at: r.at,
  by: r.by,
  note: r.note,
  events: r.events.map((e) => ({
    id: e.id,
    path: e.path,
    ...(e.value !== undefined ? { value: e.value } : {}),
  })),
})

/** Balíček, ve kterém je `keepLast` posledních revizí beze změny a starší jsou sloučené do výchozího stavu. */
/** Bez změn zadaných cest (kvůli velikosti); revize, které tím zůstanou prázdné, se vynechají. */
export function withoutPaths(b: RevisionBundle, omit: string[]): RevisionBundle {
  if (!omit.length) return b
  const revisions = b.revisions
    .map((r) => ({ ...r, events: r.events.filter((e) => !omit.includes(e.path)) }))
    .filter((r) => r.events.length)
  return { ...b, omitted: omit, revisions }
}

export function buildCompactBundle(
  log: CharacterLog,
  name: string,
  keepLast: number,
): RevisionBundle {
  const all = groupRevisions(log.events)
  const k = all.length - Math.max(0, keepLast)
  if (k < 2) return buildRevisionBundle(log, name, null) // jedna revize se zhustit nedá
  const state = characterOf({ id: log.id, events: all.slice(0, k).flatMap((r) => r.events) })
  const hash = stateHash(state)
  const at = all[k - 1].at
  const base: SharedRevision = {
    id: `komp-${hash}`,
    at,
    by: all[k - 1].by,
    note: `Zhuštěná historie (${k} revizí)`,
    events: eventsFor(emptyCharacter(log.id), state, '', '', at).map((e, i) => ({
      id: `${hash}-${i}`,
      path: e.path,
      ...(e.value !== undefined ? { value: e.value } : {}),
    })),
  }
  return {
    v: SHARE_VERSION,
    type: 'revize',
    char: log.id,
    name,
    base: null,
    compact: { upTo: all[k - 1].id, hash },
    revisions: [base, ...all.slice(k).map(shared)],
  }
}

export interface Fitted {
  code: string
  bundle: RevisionBundle
  /** kolik nejstarších revizí se sloučilo do výchozího stavu (0 = nic) */
  merged: number
  /** cesty textů vynechaných kvůli velikosti (poznámky, příběh) */
  omitted: string[]
  /** vejde se kód do požadovaného počtu QR? */
  fits: boolean
  /** počet QR, které kód potřebuje */
  qrCount: number
}

const qrCount = (code: string) => Math.max(1, Math.ceil(code.length / QR_CHUNK))

/** Texty, které se vynechají (v tomto pořadí), když se kód nevejde ani po úplném zhuštění. */
const OMIT_STEPS: string[][] = [['notes'], ['notes', 'heroStory']]

/**
 * Nejmenší zhuštění (nejvíc zachované historie), při kterém se kód vejde do `maxQr` QR. Když se nevejde
 * ani s úplným zhuštěním, vynechá poznámky a příběh; když ani to nestačí, vrátí nejmenší možný kód
 * a `fits: false`.
 */
export async function fitForQr(log: CharacterLog, name: string, maxQr: number): Promise<Fitted> {
  const limit = maxQr * QR_CHUNK
  const n = groupRevisions(log.events).length
  const make = async (keepLast: number, omit: string[] = []): Promise<Fitted> => {
    const whole =
      keepLast >= n ? buildRevisionBundle(log, name, null) : buildCompactBundle(log, name, keepLast)
    const merged = whole.compact ? n - (whole.revisions.length - 1) : 0
    const bundle = withoutPaths(whole, omit)
    const code = await encodeBundle(bundle)
    return {
      code,
      bundle,
      merged,
      omitted: omit,
      fits: code.length <= limit,
      qrCount: qrCount(code),
    }
  }
  const full = await make(n)
  if (full.fits) return full
  // nejmenší možný kód: úplné zhuštění (u jedné revize žádné), případně bez dlouhých textů
  let smallest = await make(n < 2 ? n : 0)
  for (const omit of OMIT_STEPS) {
    if (smallest.fits) break
    smallest = await make(n < 2 ? n : 0, omit)
  }
  if (!smallest.fits || smallest.omitted.length || n < 2) return smallest
  // hledáme největší počet zachovaných revizí, se kterým se kód ještě vejde
  let lo = 0
  let hi = n - 2
  let best = smallest
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const f = await make(mid)
    if (f.fits) {
      best = f
      lo = mid + 1
    } else hi = mid - 1
  }
  return best
}
