import { repo } from '../db'
import { dropNpc } from './cast'
import { assignExpedition, type Adventure, type Expedition, type Run } from './model'

const adventures = repo<Adventure>('adventures')
const expeditions = repo<Expedition>('expeditions')
const runs = repo<Run>('runs')

const stamp = <T extends { updated: string }>(x: T): T => ({ ...x, updated: new Date().toISOString() })

export const listAdventures = () => adventures.list()
export const getAdventure = (id: string) => adventures.get(id)
export const saveAdventure = (a: Adventure) => adventures.put(stamp(a))
export const deleteAdventure = (id: string) => adventures.remove(id)

export const listExpeditions = () => expeditions.list()
export const getExpedition = (id: string) => expeditions.get(id)
export const saveExpedition = (e: Expedition) => expeditions.put(stamp(e))
export const deleteExpedition = (id: string) => expeditions.remove(id)

export const listRuns = () => runs.list()
export const getRun = (id: string) => runs.get(id)
export const saveRun = (r: Run) => runs.put(stamp(r))
export const deleteRun = (id: string) => runs.remove(id)

// --- souvislosti mezi vrstvami ---

/** Uloží výpravu a zařadí ji do dobrodružství (nebo ji z dobrodružství vyřadí): drží `adventureId` a seznamy ve shodě. */
export async function saveExpeditionIn(e: Expedition, adventureId: string | undefined): Promise<Expedition> {
  const all = await listAdventures()
  const target = all.find((a) => a.id === adventureId)
  const { expedition, adventures: changed } = assignExpedition(e, target, all)
  for (const a of changed) await saveAdventure(a)
  await saveExpedition(expedition)
  return expedition
}

/** Vedení (rozehrané hry) dané výpravy. */
export const runsOfExpedition = async (expeditionId: string) =>
  (await listRuns()).filter((r) => r.expeditionId === expeditionId)

/** Smaže výpravu a vyřadí ji z dobrodružství. Výprava s vedením se nemaže (vedení by osiřelo): vrací jejich počet. */
export async function removeExpedition(id: string): Promise<{ deleted: boolean; runs: number }> {
  const runCount = (await runsOfExpedition(id)).length
  if (runCount) return { deleted: false, runs: runCount }
  for (const a of await listAdventures())
    if (a.expeditionIds.includes(id)) await saveAdventure({ ...a, expeditionIds: a.expeditionIds.filter((x) => x !== id) })
  await deleteExpedition(id)
  return { deleted: true, runs: 0 }
}

/** Smaže dobrodružství; jeho výpravy zůstanou samostatné. */
export async function removeAdventure(id: string): Promise<void> {
  for (const e of await listExpeditions())
    if (e.adventureId === id) {
      const { adventureId: _a, ...rest } = e
      await saveExpedition(rest)
    }
  await deleteAdventure(id)
}

/** Smaže cizí postavu dobrodružství a uklidí odkazy na ni ve výpravách (příhody si ponechají jméno jako text). */
export async function removeAdventureNpc(adventureId: string, npcId: string): Promise<void> {
  const a = await getAdventure(adventureId)
  if (!a) return
  await saveAdventure({ ...a, cast: (a.cast ?? []).filter((n) => n.id !== npcId) })
  for (const e of await listExpeditions()) {
    if (e.adventureId !== adventureId) continue
    const next = dropNpc(e, npcId)
    if (next !== e) await saveExpedition(next)
  }
}
