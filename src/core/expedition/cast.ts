// Cizí postavy (CP) u dobrodružství a výprav (etapa 7). Čistá logika bez úložiště; zápisy dělá store.ts.
import { newId } from '../character/model'
import type { Adventure, Expedition, Incident, Npc } from './model'

export const emptyNpc = (name = ''): Npc => ({
  id: newId(),
  name: name.trim(),
  look: '',
  conduct: '',
  knowledge: '',
  motive: '',
  group: '',
  notes: '',
})

/** Jméno skupiny bez okrajových mezer; skupiny se porovnávají bez ohledu na velikost písmen. */
const groupKey = (g: string) => g.trim().toLocaleLowerCase('cs')

export function addNpc(list: readonly Npc[] | undefined, name: string): Npc[] {
  return name.trim() ? [...(list ?? []), emptyNpc(name)] : [...(list ?? [])]
}

export const updateNpc = (list: readonly Npc[] | undefined, npc: Npc): Npc[] =>
  (list ?? []).map((n) => (n.id === npc.id ? npc : n))

/** Cizí postavy dostupné výpravě: vybrané z dobrodružství (v pořadí dobrodružství) a její vlastní. */
export function castOf(e: Expedition, adventure?: Adventure): Npc[] {
  const picked = new Set(e.castIds ?? [])
  const fromAdventure = (adventure?.cast ?? []).filter((n) => picked.has(n.id))
  return [...fromAdventure, ...(e.cast ?? [])]
}

/** Zapíná a vypíná výběr cizí postavy z dobrodružství u výpravy. */
export function togglePick(e: Expedition, npcId: string): Expedition {
  const ids = e.castIds ?? []
  return { ...e, castIds: ids.includes(npcId) ? ids.filter((x) => x !== npcId) : [...ids, npcId] }
}

/** Skupiny cizích postav seřazené podle názvu; postavy bez skupiny jsou ve skupině s prázdným názvem na konci. */
export function byGroup(npcs: readonly Npc[]): { group: string; members: Npc[] }[] {
  const map = new Map<string, { group: string; members: Npc[] }>()
  for (const n of npcs) {
    const k = groupKey(n.group)
    const g = map.get(k) ?? { group: n.group.trim(), members: [] }
    g.members.push(n)
    map.set(k, g)
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b, 'cs')))
    .map(([, g]) => g)
}

/** Názvy skupin použité v seznamu (do nabídky při psaní). */
export const groupNames = (npcs: readonly Npc[]): string[] =>
  byGroup(npcs)
    .map((g) => g.group)
    .filter(Boolean)

/** Přidá k příhodě cizí postavu z přípravy (jméno si bere z ní; stejná se nepřidá dvakrát). */
export function castNpc(i: Incident, npc: Npc): Incident {
  if (i.cast.some((c) => c.npcId === npc.id)) return i
  return {
    ...i,
    cast: [...i.cast, { name: npc.name, npcId: npc.id, ...(npc.creatureId ? { creatureId: npc.creatureId } : {}) }],
  }
}

/** Jméno a bytost postavy příhody podle aktuální přípravy (po přejmenování se jméno přebere z CP). */
export function resolveCast(i: Incident, npcs: readonly Npc[]): { name: string; creatureId?: string; npc?: Npc }[] {
  const by = new Map(npcs.map((n) => [n.id, n]))
  return i.cast.map((c) => {
    const npc = c.npcId ? by.get(c.npcId) : undefined
    const creatureId = npc?.creatureId ?? c.creatureId
    return { name: npc?.name || c.name, ...(creatureId ? { creatureId } : {}), ...(npc ? { npc } : {}) }
  })
}

/** Výprava a příhody bez odkazů na smazanou cizí postavu (příhody si jméno ponechají jako text). */
export function dropNpc(e: Expedition, npcId: string): Expedition {
  const touched = (e.castIds ?? []).includes(npcId) || (e.cast ?? []).some((n) => n.id === npcId) || e.incidents.some((i) => i.cast.some((c) => c.npcId === npcId))
  if (!touched) return e
  return {
    ...e,
    ...(e.castIds ? { castIds: e.castIds.filter((x) => x !== npcId) } : {}),
    ...(e.cast ? { cast: e.cast.filter((n) => n.id !== npcId) } : {}),
    incidents: e.incidents.map((i) =>
      i.cast.some((c) => c.npcId === npcId)
        ? { ...i, cast: i.cast.map((c) => (c.npcId === npcId ? { name: c.name, ...(c.creatureId ? { creatureId: c.creatureId } : {}) } : c)) }
        : i,
    ),
  }
}

/** Kolik příhod výprav dobrodružství cizí postavu používá (pro výpis a upozornění při smazání). */
export const usage = (npcId: string, expeditions: readonly Expedition[]): { expeditions: number; incidents: number } => ({
  expeditions: expeditions.filter((e) => (e.castIds ?? []).includes(npcId) || (e.cast ?? []).some((n) => n.id === npcId)).length,
  incidents: expeditions.reduce((n, e) => n + e.incidents.filter((i) => i.cast.some((c) => c.npcId === npcId)).length, 0),
})
