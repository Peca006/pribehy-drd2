// Přehledy vedení pro obrazovky a zahájení vedení (spojuje družiny, přípravu a stav hry).
import { newEntry, withEntry } from '../party/journal'
import { listParties, saveParty } from '../party/store'
import { roleOf, type Party } from '../party/model'
import { followUps } from './closing'
import { emptyRun, type Expedition, type Run, type RunStatus } from './model'
import { pace } from './run'
import { getAdventure, getExpedition, getRun, listExpeditions, listRuns, saveRun } from './store'

export const STATUS_LABEL: Record<RunStatus, string> = {
  probiha: 'probíhá',
  hotova: 'hotová',
  odlozena: 'odložená',
}

export interface RunRow {
  run: Run
  party?: Party
  expedition?: Expedition
  /** odehrané a všechny příhody (bez těch, které se vedení nepodařilo spojit s přípravou, je 0) */
  played: number
  total: number
}

/** Vedení s družinou a výpravou a postupem; od nejnověji upraveného. */
export async function runRows(filter: (r: Run) => boolean = () => true): Promise<RunRow[]> {
  const [runs, parties, expeditions] = await Promise.all([listRuns(), listParties(), listExpeditions()])
  return runs
    .filter(filter)
    .sort((a, b) => b.updated.localeCompare(a.updated))
    .map((run) => {
      const expedition = expeditions.find((e) => e.id === run.expeditionId)
      const p = expedition ? pace(expedition, run) : undefined
      return {
        run,
        party: parties.find((x) => x.id === run.partyId),
        expedition,
        played: p?.played ?? 0,
        total: p?.total ?? 0,
      }
    })
}

/** Družiny, které smí Průvodce vést (kopie od jiného Průvodce se nevedou). */
export const ledParties = async (): Promise<Party[]> =>
  (await listParties()).filter((p) => roleOf(p) === 'pruvodce').sort((a, b) => a.name.localeCompare(b.name, 'cs'))

/** Zahájí vedení výpravy s družinou. Družina musí být vedená touto aplikací a výprava existovat. */
export async function beginRun(expeditionId: string, partyId: string): Promise<Run> {
  const expedition = await getExpedition(expeditionId)
  if (!expedition) throw new Error('Výprava neexistuje.')
  const party = (await listParties()).find((p) => p.id === partyId)
  if (!party) throw new Error('Družina neexistuje.')
  if (roleOf(party) !== 'pruvodce') throw new Error('Tuto družinu nevedete (je to kopie od jiného Průvodce).')
  const run = emptyRun(`${expedition.name} – ${party.name}`, partyId, expeditionId)
  await saveRun(run)
  return run
}

/** Uloží zápis o výpravě do žurnálu družiny (schválený, jako zápis Průvodce) a vedení uzavře. */
export async function closeRun(
  runId: string,
  entry: { title: string; text: string },
  author: string,
  options: { close?: boolean } = {},
): Promise<{ run: Run; party: Party }> {
  const run = await getRun(runId)
  if (!run) throw new Error('Vedení neexistuje.')
  const party = (await listParties()).find((p) => p.id === run.partyId)
  if (!party) throw new Error('Družina neexistuje.')
  if (roleOf(party) !== 'pruvodce') throw new Error('Do žurnálu této družiny smí zapisovat jen její Průvodce.')
  const e = newEntry(author, true, entry.title, entry.text)
  if (!e) throw new Error('Zápis je prázdný.')
  const saved = withEntry(party, e)
  await saveParty(saved)
  const next: Run = { ...run, journalEntryId: e.id, ...(options.close === false ? {} : { status: 'hotova' as const }) }
  await saveRun(next)
  return { run: next, party: saved }
}

/** Další výpravy dobrodružství, které družina ještě nehrála. */
export async function nextExpeditions(run: Run): Promise<Expedition[]> {
  const exp = await getExpedition(run.expeditionId)
  const adv = exp?.adventureId ? await getAdventure(exp.adventureId) : undefined
  if (!exp || !adv) return []
  return followUps(exp, adv.expeditionIds, await listExpeditions(), await listRuns(), run.partyId)
}
