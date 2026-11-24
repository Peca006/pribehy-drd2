// Kořist (11e): předdefinovaná u příhod, ve vedení odhalená, upřesněná a rozdělená členům družiny.
// Peníze, Suroviny (i s druhem) a výbava se zapíšou postavě na tomto zařízení jako změna s poznámkou; u členů bez postavy
// zde (postava je u hráče) zůstane jen záznam a zápis do žurnálu. Trofeje jsou jen název a poznámka.
import { MAX_COINS, type CashUnit } from '../character/cash'
import { characterOf, eventsFor, newId, type Character } from '../character/model'
import { adjustRaw, addKind, cleanCount, cleanMark, cleanName, kindsOf } from '../character/rawMaterials'
import { appendEvents, getLog } from '../character/store'
import type { Party } from '../party/model'
import type { Expedition, Incident, Loot, LootKind, Run, RunLoot } from './model'
import { allIncidents } from './run'
import { getExpedition, getRun, saveRun } from './store'
import { getParty } from '../party/store'

export const LOOT_KINDS: { id: LootKind; label: string }[] = [
  { id: 'penize', label: 'Peníze' },
  { id: 'suroviny', label: 'Suroviny' },
  { id: 'vybava', label: 'Výbava' },
  { id: 'trofej', label: 'Trofej' },
]

export const emptyLoot = (kind: LootKind = 'penize'): Loot => ({
  id: newId(),
  kind,
  label: '',
  ...(kind === 'penize' || kind === 'suroviny' ? { amount: 1 } : {}),
  ...(kind === 'penize' ? { unit: 'grose' as CashUnit } : {}),
})

/** Kořist s upřesněnými hodnotami z vedení (přepisují přípravu). */
export function effective(loot: Loot, over: RunLoot | undefined): Loot {
  if (!over) return loot
  return {
    ...loot,
    ...(over.label !== undefined ? { label: over.label } : {}),
    ...(over.amount !== undefined ? { amount: over.amount } : {}),
    ...(over.unit !== undefined ? { unit: over.unit } : {}),
    ...(over.mark !== undefined ? { mark: over.mark } : {}),
    ...(over.note !== undefined ? { note: over.note } : {}),
  }
}

export const stateOfLoot = (run: Run, id: string): RunLoot['state'] => run.loot[id]?.state ?? 'ukryta'

export interface LootRow {
  incident: Incident
  base: Loot
  entry: RunLoot | undefined
  state: RunLoot['state']
  /** hodnoty po upřesnění */
  now: Loot
}

/** Všechna kořist výpravy (z příprav i z vymyšlených příhod) se stavem z vedení. */
export function lootRows(exp: Expedition, run: Run): LootRow[] {
  return allIncidents(exp, run).flatMap((incident) =>
    (incident.loot ?? []).map((base) => {
      const entry = run.loot[base.id]
      return { incident, base, entry, state: entry?.state ?? 'ukryta', now: effective(base, entry) }
    }),
  )
}

const COIN: Record<CashUnit, [string, string, string]> = {
  dukaty: ['dukát', 'dukáty', 'dukátů'],
  grose: ['groš', 'groše', 'grošů'],
  halere: ['haléř', 'haléře', 'haléřů'],
}

/** Jednotka mincí ve správném tvaru pro počet (1 groš, 2 groše, 5 grošů). */
export const coinWord = (unit: CashUnit, n: number): string => COIN[unit][n === 1 ? 0 : n >= 2 && n <= 4 ? 1 : 2]

/** Čitelný popis kořisti: „5 grošů“, „3× 🌿 bylina“, „Meč“. */
export function describeLoot(l: Loot): string {
  const n = l.amount ?? 0
  switch (l.kind) {
    case 'penize':
      return `${n} ${coinWord(l.unit ?? 'grose', n)}${l.label.trim() ? ` (${l.label.trim()})` : ''}`
    case 'suroviny': {
      const name = [l.mark, l.label].filter((x) => x?.trim()).join(' ').trim()
      return `${n}× Suroviny${name ? ` ${name}` : ''}`
    }
    case 'vybava':
      return l.label.trim() || 'Výbava'
    case 'trofej':
      return `Trofej: ${l.label.trim() || 'bez názvu'}${l.note?.trim() ? ` (${l.note.trim()})` : ''}`
  }
}

/** Problém s hodnotami kořisti, který brání rozdělení (prázdný řetězec = v pořádku). */
export function problem(l: Loot): string {
  if ((l.kind === 'penize' || l.kind === 'suroviny') && !(Number.isInteger(l.amount) && (l.amount ?? 0) >= 1))
    return 'Množství musí být celé číslo od 1.'
  if (l.kind === 'vybava' && !l.label.trim()) return 'Výbava potřebuje název.'
  if (l.kind === 'trofej' && !l.label.trim()) return 'Trofej potřebuje název.'
  return ''
}

/** Zapíše kořist do postavy. Trofej postavu nemění. */
export function applyLoot(c: Character, l: Loot): { character: Character } | { error: string } {
  const bad = problem(l)
  if (bad) return { error: bad }
  const n = l.amount ?? 0
  if (l.kind === 'penize') {
    const unit = l.unit ?? 'grose'
    return { character: { ...c, cash: { ...c.cash, [unit]: Math.min(MAX_COINS, (c.cash[unit] ?? 0) + n) } } }
  }
  if (l.kind === 'vybava') return { character: { ...c, equipment: [...c.equipment, l.label.trim()] } }
  if (l.kind === 'trofej') return { character: c }
  // Suroviny: bez druhu jdou do obecných, s druhem do druhu postavy (shodný název nebo značka), jinak vznikne nový druh
  const mark = cleanMark(l.mark ?? '')
  const name = cleanName(l.label)
  if (!mark && !name) return { character: adjustRaw(c, undefined, n) }
  const found = kindsOf(c).find(({ kind }) => (name && kind.name === name) || (!name && mark && kind.mark === mark))
  if (found) return { character: adjustRaw(c, found.id, n) }
  const id = newId()
  const added = addKind(c, mark, name, id)
  if ('error' in added) return { error: added.error }
  return { character: adjustRaw(added.character, id, n) }
}

/** Odhalí kořist (od této chvíle ji jde upřesnit). */
export const reveal = (run: Run, id: string): Run => ({
  ...run,
  loot: { ...run.loot, [id]: { ...run.loot[id], state: 'odhalena' } },
})

/** Upřesní odhalenou kořist; rozdělenou už ne. */
export function refine(run: Run, id: string, patch: Partial<Omit<RunLoot, 'state' | 'to' | 'applied'>>): Run {
  const cur = run.loot[id]
  if (!cur || cur.state !== 'odhalena') return run
  const next: RunLoot = { ...cur, ...patch }
  if (typeof patch.amount === 'number') next.amount = cleanCount(patch.amount)
  return { ...run, loot: { ...run.loot, [id]: next } }
}

/** Vrátí rozdělenou nebo odhalenou kořist do skryté (nevrací změny zapsané postavě). */
export function hide(run: Run, id: string): Run {
  const { [id]: _drop, ...rest } = run.loot
  return { ...run, loot: rest }
}

export interface Distribution {
  /** zapsáno do deníku postavy na tomto zařízení */
  applied: boolean
  /** proč se nezapsalo, i když šlo (jen informace pro Průvodce) */
  note?: string
}

/**
 * Rozdělí odhalenou kořist členu družiny. Má-li člen postavu v tomto zařízení, zapíše se jí kořist (peníze, suroviny, výbava)
 * jako revize s poznámkou; jinak zůstane jen záznam ve vedení (a zápis do žurnálu).
 */
export async function distribute(runId: string, lootId: string, memberId: string, author: string): Promise<Distribution> {
  const run = await getRun(runId)
  if (!run) throw new Error('Vedení neexistuje.')
  const exp = await getExpedition(run.expeditionId)
  const party = await getParty(run.partyId)
  if (!exp || !party) throw new Error('Chybí výprava nebo družina.')
  const row = lootRows(exp, run).find((r) => r.base.id === lootId)
  if (!row) throw new Error('Kořist neexistuje.')
  if (row.state === 'rozdelena') throw new Error('Kořist už je rozdělená.')
  if (row.state !== 'odhalena') throw new Error('Kořist je ještě skrytá, nejdřív ji odhalte.')
  const member = party.members.find((m) => m.id === memberId)
  if (!member) throw new Error('Člen družiny neexistuje.')
  const bad = problem(row.now)
  if (bad) throw new Error(bad)

  let applied = false
  let note: string | undefined
  if (row.now.kind !== 'trofej' && member.characterId) {
    const log = await getLog(member.characterId)
    if (log) {
      const before = characterOf(log)
      const r = applyLoot(before, row.now)
      if ('error' in r) throw new Error(r.error)
      await appendEvents(log.id, eventsFor(before, r.character, author, `Kořist z výpravy „${exp.name}“: ${describeLoot(row.now)}`))
      applied = true
    } else note = 'Postava člena není v tomto zařízení.'
  }
  const entry: RunLoot = { ...run.loot[lootId], state: 'rozdelena', to: memberId, applied }
  await saveRun({ ...run, loot: { ...run.loot, [lootId]: entry } })
  return { applied, ...(note ? { note } : {}) }
}

/** Řádky kořisti pro zápis do žurnálu: rozdělená kořist a komu připadla. */
export function lootLines(exp: Expedition, run: Run, party: Pick<Party, 'members'> | undefined): string[] {
  return lootRows(exp, run)
    .filter((r) => r.state === 'rozdelena')
    .map((r) => {
      const who = party?.members.find((m) => m.id === r.entry?.to)?.name
      return `• ${describeLoot(r.now)}${who ? ` → ${who}` : ''}`
    })
}
