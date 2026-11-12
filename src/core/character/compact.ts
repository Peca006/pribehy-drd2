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
  /** vejde se kód do požadovaného počtu QR? */
  fits: boolean
  /** počet QR, které kód potřebuje */
  qrCount: number
}

const qrCount = (code: string) => Math.max(1, Math.ceil(code.length / QR_CHUNK))

/**
 * Nejmenší zhuštění (nejvíc zachované historie), při kterém se kód vejde do `maxQr` QR. Když se nevejde
 * ani s úplným zhuštěním, vrátí nejmenší možný kód a `fits: false`.
 */
export async function fitForQr(log: CharacterLog, name: string, maxQr: number): Promise<Fitted> {
  const limit = maxQr * QR_CHUNK
  const n = groupRevisions(log.events).length
  const make = async (keepLast: number): Promise<Fitted> => {
    const bundle =
      keepLast >= n ? buildRevisionBundle(log, name, null) : buildCompactBundle(log, name, keepLast)
    const code = await encodeBundle(bundle)
    return {
      code,
      bundle,
      merged: bundle.compact ? n - (bundle.revisions.length - 1) : 0,
      fits: code.length <= limit,
      qrCount: qrCount(code),
    }
  }
  const full = await make(n)
  if (full.fits || n < 2) return full
  const smallest = await make(0)
  if (!smallest.fits) return smallest
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
