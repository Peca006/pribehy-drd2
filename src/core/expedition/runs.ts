// Přehledy vedení pro obrazovky a zahájení vedení (spojuje družiny, přípravu a stav hry).
import { listParties } from '../party/store'
import { roleOf, type Party } from '../party/model'
import { emptyRun, type Expedition, type Run, type RunStatus } from './model'
import { pace } from './run'
import { getExpedition, listExpeditions, listRuns, saveRun } from './store'

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
