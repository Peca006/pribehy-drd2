// Stav bestiáře: bytosti z balíčků (jen ke čtení) + vlastní bytosti vypravěče (úpravy, import).
import type { Creature, CreatureKind } from '../../core/content/schema'
import { deleteUserCreature, listUserCreatures, saveUserCreature } from '../../core/creatures/store'
import { creatureKinds, packCreatures } from '../../core/library.svelte'

export const bestiary = $state<{ user: Creature[]; loaded: boolean }>({ user: [], loaded: false })

export async function refreshBestiary() {
  bestiary.user = await listUserCreatures()
  bestiary.loaded = true
}

export const saveCreature = async (c: Creature) => {
  await saveUserCreature(c)
  await refreshBestiary()
}
export const removeCreature = async (id: string) => {
  await deleteUserCreature(id)
  await refreshBestiary()
}

/** Všechny bytosti: z balíčků, pak vlastní. */
export const allCreatures = (): Creature[] => [...packCreatures(), ...bestiary.user]

export const findCreature = (id: string): Creature | undefined =>
  allCreatures().find((c) => c.id === id)

const OWN: CreatureKind = { id: 'vlastni', name: 'Vlastní' }
export const kinds = (): CreatureKind[] => {
  const k = [...creatureKinds()]
  for (const c of bestiary.user)
    if (!k.some((x) => x.id === c.kind) && c.kind !== OWN.id) k.push({ id: c.kind, name: c.kind })
  return [...k, OWN]
}
export const kindName = (id: string) => kinds().find((k) => k.id === id)?.name ?? id

export const isUser = (c: Creature) => c.source === 'user'
