// Vedení (rozehraná hra jedné družiny s jednou výpravou): stav příhod, dosažené uzlové body, tempo Zdrojů.
// Vedení odkazuje na přípravu živě podle `id`; příhoda bez záznamu je „připravená“. Funkce jsou čisté.
import { newId } from '../character/model'
import { decks, emptyIncident, START } from './deck'
import { ANYTIME, type Expedition, type Incident, type Outcome, type Run, type RunIncident } from './model'

export type IncidentState = 'priprava' | 'nasazena' | 'odehrana' | 'odlozena'

export const OUTCOMES: { id: Outcome; label: string }[] = [
  { id: 'uspech', label: 'Úspěch' },
  { id: 'neuspech', label: 'Neúspěch' },
  { id: 'jinak', label: 'Jinak (úspěch s výhradou, jiné řešení)' },
]

export const stateOf = (run: Run, incidentId: string): IncidentState => run.incidents[incidentId]?.state ?? 'priprava'

/** Příhody výpravy a příhody vymyšlené při hře (ty jsou na konci). */
export const allIncidents = (exp: Expedition, run: Run): Incident[] => [...exp.incidents, ...run.extra]

/** Balíček, ve kterém se příběh právě nachází: po naposledy dosaženém uzlu, jinak na začátku. */
export function currentStage(exp: Expedition, run: Run): string {
  const ids = new Set(exp.nodes.map((n) => n.id))
  const reached = run.reachedNodes.filter((id) => ids.has(id))
  return reached.length ? reached[reached.length - 1] : START
}

/** První dosud nedosažený uzlový bod v pořadí přípravy. */
export const nextNode = (exp: Expedition, run: Run) => exp.nodes.find((n) => !run.reachedNodes.includes(n.id))

export function reachNode(run: Run, nodeId: string): Run {
  return run.reachedNodes.includes(nodeId) ? run : { ...run, reachedNodes: [...run.reachedNodes, nodeId] }
}

/** Vrátí uzlový bod mezi nedosažené (omyl při klepnutí). */
export const unreachNode = (run: Run, nodeId: string): Run => ({
  ...run,
  reachedNodes: run.reachedNodes.filter((id) => id !== nodeId),
})

function patchIncident(run: Run, id: string, fn: (cur: RunIncident | undefined) => RunIncident | undefined): Run {
  const next = fn(run.incidents[id])
  const incidents = { ...run.incidents }
  if (next) incidents[id] = next
  else delete incidents[id]
  return { ...run, incidents }
}

/** Nasadí příhodu do hry (hráči se s ní teď setkávají). */
export const deploy = (run: Run, id: string): Run =>
  patchIncident(run, id, (c) => ({ result: c?.result ?? '', ...(c?.outcome ? { outcome: c.outcome } : {}), state: 'nasazena' }))

/** Odehraná příhoda s výsledkem a poznámkou. */
export const finish = (run: Run, id: string, outcome: Outcome, result: string, at = new Date().toISOString()): Run =>
  patchIncident(run, id, () => ({ state: 'odehrana', outcome, result: result.trim(), at }))

/** Odloží příhodu na později (zůstane k dispozici). */
export const postpone = (run: Run, id: string): Run =>
  patchIncident(run, id, (c) => ({ result: c?.result ?? '', state: 'odlozena' }))

/** Vrátí příhodu do přípravy (smaže její stav). */
export const reset = (run: Run, id: string): Run => patchIncident(run, id, () => undefined)

export interface PlayItem {
  incident: Incident
  state: IncidentState
  run?: RunIncident
  /** vymyšlená při hře */
  extra: boolean
}

export interface PlayDeck {
  key: string
  title: string
  /** balíček, ve kterém se příběh právě nachází */
  current: boolean
  items: PlayItem[]
  /** kolik příhod ještě není odehráno */
  open: number
}

/** Balíčky pro hru: balíčky přípravy a nakonec „Vymyšleno při hře“ (jen když tam něco je). */
export function playDecks(exp: Expedition, run: Run): PlayDeck[] {
  const cur = currentStage(exp, run)
  const item = (incident: Incident, extra: boolean): PlayItem => ({
    incident,
    state: stateOf(run, incident.id),
    run: run.incidents[incident.id],
    extra,
  })
  const open = (items: PlayItem[]) => items.filter((i) => i.state !== 'odehrana').length
  const out: PlayDeck[] = decks(exp).map((d) => {
    const items = d.incidents.map((i) => item(i, false))
    return { key: d.key, title: d.title, current: d.key === cur, items, open: open(items) }
  })
  if (run.extra.length) {
    const items = run.extra.map((i) => item(i, true))
    out.push({ key: 'extra', title: 'Vymyšleno při hře', current: false, items, open: open(items) })
  }
  return out
}

export interface Pace {
  /** příhody v aktuálním balíčku, které ještě nejsou odehrány */
  openHere: number
  /** příhody „kdykoli“, které ještě nejsou odehrány */
  openAnytime: number
  /** další uzlový bod a kolik příhod (nejsou-li odehrány) před ním ještě zbývá */
  next?: { title: string; incidents: number }
  /** další příležitost k odpočinku a kolik příhod před ní zbývá */
  rest?: { title: string; incidents: number }
  /** odehrané příhody celkem a všechny příhody výpravy (bez „kdykoli“ i s nimi) */
  played: number
  total: number
}

/**
 * Ukazatel „Hrajete o Zdroje“: kolik příhod čeká do dalšího uzlového bodu a do další příležitosti k odpočinku.
 * Jen pomůcka pro Průvodce (SRD: hrdinům mají Zdroje vystačit „tak akorát“), žádná obtížnost.
 */
export function pace(exp: Expedition, run: Run): Pace {
  const list = playDecks(exp, run)
  const byKey = new Map(list.map((d) => [d.key, d]))
  const cur = currentStage(exp, run)
  const order = [START, ...exp.nodes.map((n) => n.id)]
  const here = order.indexOf(cur)
  // příhody před uzlem k jsou v balíčcích na pozicích here .. k (balíček na pozici k je „po uzlu k-1“)
  const before = (k: number) =>
    order.slice(here, k + 1).reduce((n, key) => n + (byKey.get(key)?.open ?? 0), 0)
  const unreached = exp.nodes.map((n, i) => ({ n, i })).filter(({ n }) => !run.reachedNodes.includes(n.id))
  const nx = unreached[0]
  const rs = unreached.find(({ n }) => n.kind === 'odpocinek')
  const name = (n: { title: string }, i: number) => n.title.trim() || `Uzlový bod ${i + 1}`
  const all = list.flatMap((d) => d.items)
  return {
    openHere: byKey.get(cur)?.open ?? 0,
    openAnytime: byKey.get(ANYTIME)?.open ?? 0,
    ...(nx ? { next: { title: name(nx.n, nx.i), incidents: before(nx.i) } } : {}),
    ...(rs ? { rest: { title: name(rs.n, rs.i), incidents: before(rs.i) } } : {}),
    played: all.filter((i) => i.state === 'odehrana').length,
    total: all.length,
  }
}

/** Přidá příhodu vymyšlenou při hře; patří do aktuálního balíčku. */
export function addExtra(exp: Expedition, run: Run, title: string): { run: Run; incident: Incident } {
  const incident = { ...emptyIncident(currentStage(exp, run)), id: newId(), title: title.trim() }
  return { run: { ...run, extra: [...run.extra, incident] }, incident }
}

export const removeExtra = (run: Run, id: string): Run => {
  const { [id]: _drop, ...incidents } = run.incidents
  return { ...run, extra: run.extra.filter((i) => i.id !== id), incidents }
}

/** Uloží vymyšlenou příhodu do přípravy výpravy (vrátí upravenou výpravu i vedení; stav příhody se zachová). */
export function promoteExtra(exp: Expedition, run: Run, id: string): { expedition: Expedition; run: Run } {
  const x = run.extra.find((i) => i.id === id)
  if (!x) return { expedition: exp, run }
  return {
    expedition: { ...exp, incidents: [...exp.incidents, x] },
    run: { ...run, extra: run.extra.filter((i) => i.id !== id) },
  }
}
