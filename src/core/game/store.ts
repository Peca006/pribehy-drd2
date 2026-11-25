import { repo } from '../db'
import type { Sitting } from './clock'

const sittings = repo<Sitting>('sittings')

export const getSitting = (id: string) => sittings.get(id)
export const saveSitting = (s: Sitting) => sittings.put(s)
export const deleteSitting = (id: string) => sittings.remove(id)

/** Sezení družiny, nejnovější první. */
export async function listSittings(partyId: string): Promise<Sitting[]> {
  return (await sittings.list()).filter((s) => s.partyId === partyId).sort((a, b) => b.started - a.started)
}

/** Nedokončené sezení družiny (běží, nebo je v pauze), pokud existuje. */
export async function openSitting(partyId: string): Promise<Sitting | undefined> {
  return (await listSittings(partyId)).find((s) => s.status !== 'hotovo')
}

/** Smaže všechna sezení družiny (při smazání družiny). */
export async function removePartySittings(partyId: string): Promise<void> {
  for (const s of await listSittings(partyId)) await deleteSitting(s.id)
}
