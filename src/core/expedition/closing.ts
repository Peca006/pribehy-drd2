// Uzavření výpravy: shrnutí odehraných příhod jako návrh zápisu do žurnálu družiny a následná výprava z dobrodružství.
// Zápis v žurnálu uvidí hráči po sdílení družiny, proto je to jen návrh textu, který Průvodce upraví (nesmí prozradit tajemství).
import { decks } from './deck'
import type { Expedition, Run } from './model'
import { OUTCOMES, allIncidents, stateOf } from './run'

export interface JournalDraft {
  title: string
  text: string
}

const outcomeWord = (o?: string) => (OUTCOMES.find((x) => x.id === o)?.label ?? '').split(' (')[0].toLowerCase()

/** Odehrané příhody v pořadí, jak proběhly (podle času; bez času v pořadí balíčků). */
export function playedIncidents(exp: Expedition, run: Run) {
  const order = new Map<string, number>()
  decks(exp)
    .flatMap((d) => d.incidents)
    .concat(run.extra)
    .forEach((i, k) => order.set(i.id, k))
  return allIncidents(exp, run)
    .filter((i) => stateOf(run, i.id) === 'odehrana')
    .sort((a, b) => {
      const ta = run.incidents[a.id]?.at ?? ''
      const tb = run.incidents[b.id]?.at ?? ''
      return ta && tb ? ta.localeCompare(tb) : (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
    })
}

/** Návrh zápisu do žurnálu: příhody s výsledky, dosažené uzlové body a poznámky ze hry. */
export function journalDraft(exp: Expedition, run: Run): JournalDraft {
  const lines: string[] = []
  if (exp.goal.trim()) lines.push(`Cíl výpravy: ${exp.goal.trim()}`)
  const played = playedIncidents(exp, run)
  if (played.length) {
    lines.push('', 'Co se odehrálo:')
    for (const i of played) {
      const r = run.incidents[i.id]
      const how = outcomeWord(r?.outcome)
      lines.push(`• ${i.title.trim() || 'Příhoda'}${how ? ` (${how})` : ''}${r?.result ? `: ${r.result}` : ''}`)
    }
  }
  const reached = exp.nodes.filter((n) => run.reachedNodes.includes(n.id)).map((n) => n.title.trim()).filter(Boolean)
  if (reached.length) lines.push('', `Zlomové okamžiky: ${reached.join(', ')}.`)
  if (run.notes.trim()) lines.push('', run.notes.trim())
  return { title: `Výprava: ${exp.name.trim() || 'bez názvu'}`, text: lines.join('\n').trim() }
}

/** Výpravy, které v dobrodružství následují po této (v doporučeném pořadí) a družina je ještě nehrála. */
export function followUps(
  exp: Expedition,
  adventureOrder: readonly string[],
  all: readonly Expedition[],
  runs: readonly Run[],
  partyId: string,
): Expedition[] {
  const at = adventureOrder.indexOf(exp.id)
  if (at < 0) return []
  const played = new Set(runs.filter((r) => r.partyId === partyId).map((r) => r.expeditionId))
  return adventureOrder
    .slice(at + 1)
    .map((id) => all.find((e) => e.id === id))
    .filter((e): e is Expedition => !!e && !played.has(e.id))
}
