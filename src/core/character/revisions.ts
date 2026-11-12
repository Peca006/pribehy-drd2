// Revize deníku postavy: změny zveřejněné společně (jedno „Zveřejnit“) tvoří jednu revizi. Z deníku se dá
// zjistit, co revize změnila („před → po“), a vytvořit nová revize, která ji vrací (historie se nikdy nemaže).
import { applyChange, characterOf, eventsFor, type Character, type ChangeEvent, type CharacterLog } from './model'

export interface Revision {
  id: string
  at: string
  by: string
  note: string
  events: ChangeEvent[]
}

export interface RevisionChange {
  path: string
  before: unknown
  after: unknown
}

const keyOf = (e: ChangeEvent) => e.rev ?? `${e.at}|${e.by}|${e.note ?? ''}`

/** Sousedící změny se stejnou revizí (u starších záznamů se stejným časem, autorem a poznámkou). */
export function groupRevisions(events: ChangeEvent[]): Revision[] {
  const out: Revision[] = []
  let key = ''
  for (const e of events) {
    const k = keyOf(e)
    if (k !== key || !out.length) {
      out.push({ id: k, at: e.at, by: e.by, note: e.note ?? '', events: [] })
      key = k
    }
    out[out.length - 1].events.push(e)
  }
  return out
}

/** Hodnota na cestě `a.b.c` (nebo `undefined`). */
export function getAt(c: Character, path: string): unknown {
  let node: unknown = c
  for (const k of path.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined
    node = (node as Record<string, unknown>)[k]
  }
  return node
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** Co revize změnila: stará a nová hodnota u každé cesty (u cesty změněné víckrát první „před“, poslední „po“). */
export function revisionChanges(log: CharacterLog, rev: Revision): RevisionChange[] {
  const start = log.events.findIndex((e) => e.id === rev.events[0].id)
  let state = characterOf({ id: log.id, events: log.events.slice(0, Math.max(0, start)) })
  const byPath = new Map<string, RevisionChange>()
  for (const e of rev.events) {
    const before = getAt(state, e.path)
    state = applyChange(state, e)
    const seen = byPath.get(e.path)
    if (seen) seen.after = getAt(state, e.path)
    else byPath.set(e.path, { path: e.path, before, after: getAt(state, e.path) })
  }
  return [...byPath.values()].filter((c) => !same(c.before, c.after))
}

/** Změny porovnávající dvě postavy (pro náhled před zveřejněním). */
export function changesBetween(before: Character, after: Character): RevisionChange[] {
  return eventsFor(before, after, '', '').map((e) => ({
    path: e.path,
    before: getAt(before, e.path),
    after: e.value,
  }))
}

/**
 * Změny, které vrátí hodnoty z doby před revizí. Platí vůči současnému stavu: pozdější změny
 * stejných polí se přepíšou, ostatní zůstanou.
 */
export function revertEvents(log: CharacterLog, rev: Revision, by: string, note: string): ChangeEvent[] {
  const current = characterOf(log)
  const rid = `rev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  const at = new Date().toISOString()
  return revisionChanges(log, rev)
    .filter((c) => !same(getAt(current, c.path), c.before))
    .map((c, i) => ({ id: `${rid}-${i}`, at, by, note, rev: rid, path: c.path, value: c.before }))
}
