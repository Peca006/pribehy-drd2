// Čitelný popis změn postavy (pro historii a náhled před zveřejněním).
import type { RawMaterialKind, Scar } from '../../core/character/model'
import { kindFull } from '../../core/character/rawMaterials'
import type { Potion, Trap } from '../../core/character/model'
import { trapSummary } from '../../core/character/traps'
import type { RecipeLink } from '../../core/recipes/model'
import { potionLabel } from '../../core/character/potions'
import { cashFrom, formatCash, UNIT_LABEL, type CashUnit } from '../../core/character/cash'
import type { RevisionChange } from '../../core/character/revisions'
import { findAbility, professions, races } from '../../core/library.svelte'

const LABELS: Record<string, string> = {
  name: 'Jméno',
  notes: 'Poznámky',
  concept: 'Koncept',
  equipment: 'Výbava',
  cash: 'Hotovost',
  rawMaterials: 'Suroviny (bez druhu)',
  xp: 'Zkušenosti',
  scars: 'Jizvy',
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
  if (path.startsWith('rawMaterialKinds.')) return 'Druh Surovin'
  if (path.startsWith('potions.')) return 'Lektvar'
  if (path.startsWith('traps.')) return 'Nástraha'
  if (path.startsWith('recipeLinks.')) return 'Předpis'
  if (path.startsWith('cash.')) return `Hotovost: ${UNIT_LABEL[path.slice(5) as CashUnit]?.toLowerCase() ?? path.slice(5)}`
  return LABELS[path] ?? path
}

const short = (s: string, n = 90) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

function scalar(path: string, v: unknown): string {
  if (v === undefined || v === null || v === '') return '—'
  if (path === 'cash') return formatCash(cashFrom(v))
  if (path === 'raceId' || path === 'cultureId') return nameOf(String(v))
  if (path === 'trait') return short(String(v).replace(/^rys:/, ''))
  return short(String(v))
}

/** Řádky popisu jedné změny: u seznamů přidané (+) a odebrané (−) položky, jinak „před → po“. */
export function describeChange(c: RevisionChange): string[] {
  if (c.path === 'scars') {
    const list = (v: unknown) => (Array.isArray(v) ? (v as Scar[]) : [])
    const fmt = (s: Scar) => `${s.attribute} ${s.severity}${s.note ? `: ${s.note}` : ''}`
    const before = list(c.before)
    const after = list(c.after)
    const lines = [
      ...after.filter((s) => !before.some((b) => b.id === s.id)).map((s) => `+ ${fmt(s)}`),
      ...before.filter((s) => !after.some((a) => a.id === s.id)).map((s) => `− ${fmt(s)}`),
      ...after
        .filter((s) => before.some((b) => b.id === s.id && JSON.stringify(b) !== JSON.stringify(s)))
        .map((s) => `~ ${fmt(s)}`),
    ]
    return lines.length ? lines : ['(beze změny)']
  }
  if (c.path.startsWith('traps.')) {
    const b = c.before as Trap | undefined
    const a = c.after as Trap | undefined
    if (!b && a) return [`+ ${trapSummary(a)} (${a.count})`]
    if (b && !a) return [`− ${trapSummary(b)} (${b.count})`]
    if (b && a) {
      const lines: string[] = []
      if (trapSummary(b) !== trapSummary(a)) lines.push(`${trapSummary(b)} → ${trapSummary(a)}`)
      if (b.count !== a.count) lines.push(`${a.name}: ${b.count} → ${a.count} ks`)
      return lines.length ? lines : ['(beze změny)']
    }
  }
  if (c.path.startsWith('recipeLinks.')) {
    const b = c.before as RecipeLink | undefined
    const a = c.after as RecipeLink | undefined
    if (!b && a) return ['+ předpis (odkaz do Grimoáru)']
    if (b && !a) return ['− předpis (odkaz do Grimoáru)']
    if (b && a) {
      const lines: string[] = []
      if (b.recipeId !== a.recipeId) lines.push('odkaz míří na jiný předpis')
      for (const k of new Set([...Object.keys(b.state), ...Object.keys(a.state)]))
        if (b.state[k] !== a.state[k]) lines.push(`${k}: ${b.state[k] ?? '—'} → ${a.state[k] ?? '—'}`)
      return lines.length ? lines : ['(beze změny)']
    }
  }
  if (c.path.startsWith('potions.')) {
    const b = c.before as Potion | undefined
    const a = c.after as Potion | undefined
    if (!b && a) return [`+ ${potionLabel(a)} (${a.count})`]
    if (b && !a) return [`− ${potionLabel(b)} (${b.count})`]
    if (b && a) {
      const lines: string[] = []
      if (potionLabel(b) !== potionLabel(a)) lines.push(`${potionLabel(b)} → ${potionLabel(a)}`)
      if (b.count !== a.count) lines.push(`${potionLabel(a)}: ${b.count} → ${a.count}`)
      if (b.note !== a.note) lines.push(`poznámka: ${a.note || '—'}`)
      return lines.length ? lines : ['(beze změny)']
    }
  }
  if (c.path.startsWith('rawMaterialKinds.')) {
    const b = c.before as RawMaterialKind | undefined
    const a = c.after as RawMaterialKind | undefined
    if (!b && a) return [`+ ${kindFull(a)} (${a.count})`]
    if (b && !a) return [`− ${kindFull(b)} (${b.count})`]
    if (b && a) {
      const label = kindFull(a)
      const lines: string[] = []
      if (kindFull(b) !== label) lines.push(`${kindFull(b)} → ${label}`)
      if (b.count !== a.count) lines.push(`${label}: ${b.count} → ${a.count}`)
      return lines.length ? lines : ['(beze změny)']
    }
  }
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
  const before =
    c.path.startsWith('professions.') && c.before === undefined ? 'nemá' : scalar(c.path, c.before)
  const after =
    c.path.startsWith('professions.') && c.after === undefined
      ? 'odebráno'
      : scalar(c.path, c.after)
  return [`${before} → ${after}`]
}
