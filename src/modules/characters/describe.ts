// Čitelný popis změn postavy (pro historii a náhled před zveřejněním).
import type { RevisionChange } from '../../core/character/revisions'
import { findAbility, professions, races } from '../../core/library.svelte'
import { formatMoney } from '../creator/rules'

const LABELS: Record<string, string> = {
  name: 'Jméno',
  notes: 'Poznámky',
  concept: 'Koncept',
  equipment: 'Výbava',
  cash: 'Hotovost',
  abilities: 'Schopnosti',
  trait: 'Povahový rys',
  heroStory: 'Jak se stal hrdinou',
  raceId: 'Rasa',
  cultureId: 'Kultura',
  weaponKind: 'Druh zbraně',
}

/** Název obsahu podle ID (povolání, rasa, kultura, schopnost); jinak ID bez předpony. */
export function nameOf(id: string): string {
  const p = professions().find((x) => x.id === id)
  if (p) return p.name
  for (const r of races()) {
    if (r.id === id) return r.name
    const c = r.cultures.find((x) => x.id === id)
    if (c) return c.name
  }
  return findAbility(id)?.name ?? id.replace(/^[^:]+:/, '')
}

export function pathLabel(path: string): string {
  if (path.startsWith('attributes.')) return `Zdatnost: ${path.slice(11)}`
  if (path.startsWith('professions.')) return `Povolání: ${nameOf(path.slice(12))}`
  return LABELS[path] ?? path
}

const short = (s: string, n = 90) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

function scalar(path: string, v: unknown): string {
  if (v === undefined || v === null || v === '') return '—'
  if (path === 'cash') return formatMoney(Number(v))
  if (path === 'raceId' || path === 'cultureId') return nameOf(String(v))
  if (path === 'trait') return short(String(v).replace(/^rys:/, ''))
  return short(String(v))
}

/** Řádky popisu jedné změny: u seznamů přidané (+) a odebrané (−) položky, jinak „před → po“. */
export function describeChange(c: RevisionChange): string[] {
  if (Array.isArray(c.before) || Array.isArray(c.after)) {
    const before = (Array.isArray(c.before) ? c.before : []) as string[]
    const after = (Array.isArray(c.after) ? c.after : []) as string[]
    const nm = (x: string) => (c.path === 'abilities' ? nameOf(x) : short(x))
    const lines = [
      ...after.filter((x) => !before.includes(x)).map((x) => `+ ${nm(x)}`),
      ...before.filter((x) => !after.includes(x)).map((x) => `− ${nm(x)}`),
    ]
    return lines.length ? lines : ['(změněno pořadí)']
  }
  const before = c.path.startsWith('professions.') && c.before === undefined ? 'nemá' : scalar(c.path, c.before)
  const after = c.path.startsWith('professions.') && c.after === undefined ? 'odebráno' : scalar(c.path, c.after)
  return [`${before} → ${after}`]
}
