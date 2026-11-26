// Zásilky obsahu mezi vypravěči: výprava, dobrodružství (s výpravami a cizími postavami) a cizí postavy.
// Společná obálka `{ v, type: 'obsah', kind, … }` (soubor, kód `DRD2:`; později i WebRTC, viz PLAN-WEBRTC.md).
// Obsah je tajný jen vůči hráčům: vypravěč ho posílá jinému vypravěči, proto se pozadí a příhody přenášejí.
// Stav vedení (`Run`) se nepřenáší nikdy. Příjemce vše očistí a při uložení vždy přidělí nová ID (nic nepřepisuje).
import { newId } from '../character/model'
import { castOf } from '../expedition/cast'
import {
  STYLES,
  type Adventure,
  type Expedition,
  type Incident,
  type Loot,
  type LootKind,
  type Node,
  type Npc,
} from '../expedition/model'
import { UNIT_ORDER } from '../character/cash'

export const CONTENT_VERSION = 1
export type ContentKind = 'vyprava' | 'dobrodruzstvi' | 'cizi-postava'

/** Výprava je soběstačná: cizí postavy vybrané z dobrodružství jsou přiložené v `cast`, `castIds` odpadá. */
export interface ExpeditionContent {
  v: 1
  type: 'obsah'
  kind: 'vyprava'
  expedition: Expedition
}
export interface AdventureContent {
  v: 1
  type: 'obsah'
  kind: 'dobrodruzstvi'
  adventure: Adventure
  expeditions: Expedition[]
}
export interface NpcContent {
  v: 1
  type: 'obsah'
  kind: 'cizi-postava'
  npcs: Npc[]
}
export type Content = ExpeditionContent | AdventureContent | NpcContent

export const MAX_EXPEDITIONS = 50
const MAX_NPCS = 200
const MAX_NODES = 100
const MAX_INCIDENTS = 300
const MAX_TEXT = 20000

const str = (v: unknown, max = MAX_TEXT): string => (typeof v === 'string' ? v.slice(0, max) : '')
const idOf = (v: unknown): string => str(v, 100).trim() || newId()
const list = (v: unknown, max: number): unknown[] => (Array.isArray(v) ? v.slice(0, max) : [])
const rec = (v: unknown): Record<string, unknown> | undefined =>
  typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined
const now = () => new Date().toISOString()

// --- očištění ---

export function sanitizeNpc(raw: unknown): Npc | undefined {
  const r = rec(raw)
  const name = r && str(r.name, 200).trim()
  if (!r || !name) return undefined
  const creatureId = str(r.creatureId, 200).trim()
  return {
    id: idOf(r.id),
    name,
    look: str(r.look),
    conduct: str(r.conduct),
    knowledge: str(r.knowledge),
    motive: str(r.motive),
    group: str(r.group, 200),
    ...(creatureId ? { creatureId } : {}),
    notes: str(r.notes),
  }
}

const LOOT_KINDS: LootKind[] = ['penize', 'suroviny', 'vybava', 'trofej']

function sanitizeLoot(raw: unknown): Loot | undefined {
  const r = rec(raw)
  if (!r || !LOOT_KINDS.includes(r.kind as LootKind)) return undefined
  const amount = typeof r.amount === 'number' && Number.isFinite(r.amount) && r.amount >= 0 && r.amount <= 1e9 ? r.amount : undefined
  const unit = UNIT_ORDER.find((u) => u === r.unit)
  const mark = str(r.mark, 200)
  const note = str(r.note, 2000)
  return {
    id: idOf(r.id),
    kind: r.kind as LootKind,
    label: str(r.label, 300),
    ...(amount !== undefined ? { amount } : {}),
    ...(unit ? { unit } : {}),
    ...(mark ? { mark } : {}),
    ...(note ? { note } : {}),
  }
}

function sanitizeNode(raw: unknown): Node | undefined {
  const r = rec(raw)
  if (!r) return undefined
  const title = str(r.title, 300)
  const text = str(r.text)
  if (!title.trim() && !text.trim()) return undefined
  const kind = r.kind === 'zvrat' || r.kind === 'odpocinek' ? r.kind : undefined
  return { id: idOf(r.id), title, text, ...(kind ? { kind } : {}) }
}

function sanitizeIncident(raw: unknown): Incident | undefined {
  const r = rec(raw)
  if (!r) return undefined
  const title = str(r.title, 300)
  const text = str(r.text)
  if (!title.trim() && !text.trim()) return undefined
  const place = str(r.place, 300)
  const loot = list(r.loot, 30).map(sanitizeLoot).filter((x): x is Loot => !!x)
  return {
    id: idOf(r.id),
    title,
    text,
    stage: str(r.stage, 100),
    ...(place ? { place } : {}),
    cast: list(r.cast, 50).flatMap((c) => {
      const x = rec(c)
      const name = x ? str(x.name, 200) : ''
      if (!x || !name.trim()) return []
      const npcId = str(x.npcId, 100).trim()
      const creatureId = str(x.creatureId, 200).trim()
      return [{ name, ...(npcId ? { npcId } : {}), ...(creatureId ? { creatureId } : {}) }]
    }),
    conditions: str(r.conditions),
    ifSuccess: str(r.ifSuccess),
    ifFailure: str(r.ifFailure),
    ...(loot.length ? { loot } : {}),
  }
}

export function sanitizeExpedition(raw: unknown): Expedition | undefined {
  const r = rec(raw)
  const name = r && str(r.name, 200).trim()
  if (!r || !name) return undefined
  const cast = list(r.cast, MAX_NPCS).map(sanitizeNpc).filter((x): x is Npc => !!x)
  const castIds = list(r.castIds, MAX_NPCS).filter((x): x is string => typeof x === 'string').map((x) => x.slice(0, 100))
  return {
    id: idOf(r.id),
    name,
    theme: str(r.theme, 500),
    background: str(r.background),
    hook: str(r.hook),
    goal: str(r.goal),
    style: STYLES.some((s) => s.id === r.style) ? (r.style as Expedition['style']) : 'domino',
    nodes: list(r.nodes, MAX_NODES).map(sanitizeNode).filter((x): x is Node => !!x),
    incidents: list(r.incidents, MAX_INCIDENTS).map(sanitizeIncident).filter((x): x is Incident => !!x),
    ...(castIds.length ? { castIds } : {}),
    ...(cast.length ? { cast } : {}),
    resolution: str(r.resolution),
    notes: str(r.notes),
    created: now(),
    updated: now(),
  }
}

function sanitizeAdventure(raw: unknown): Adventure | undefined {
  const r = rec(raw)
  const name = r && str(r.name, 200).trim()
  if (!r || !name) return undefined
  const cast = list(r.cast, MAX_NPCS).map(sanitizeNpc).filter((x): x is Npc => !!x)
  return {
    id: idOf(r.id),
    name,
    theme: str(r.theme, 500),
    background: str(r.background),
    notes: str(r.notes),
    ...(cast.length ? { cast } : {}),
    expeditionIds: list(r.expeditionIds, MAX_EXPEDITIONS).filter((x): x is string => typeof x === 'string').map((x) => x.slice(0, 100)),
    created: now(),
    updated: now(),
  }
}

/** Očistí obálku obsahu z neznámého zdroje. */
export function sanitizeContent(raw: unknown): { content?: Content; errors: string[] } {
  const r = rec(raw)
  if (!r || r.type !== 'obsah') return { errors: ['Nejde o zásilku obsahu.'] }
  if (r.v !== CONTENT_VERSION) return { errors: [`Nepodporovaná verze zásilky: ${String(r.v)}`] }
  const errors: string[] = []
  if (r.kind === 'vyprava') {
    const expedition = sanitizeExpedition(r.expedition)
    return expedition
      ? { content: { v: 1, type: 'obsah', kind: 'vyprava', expedition }, errors }
      : { errors: ['Výprava nemá použitelný název.'] }
  }
  if (r.kind === 'dobrodruzstvi') {
    const adventure = sanitizeAdventure(r.adventure)
    if (!adventure) return { errors: ['Dobrodružství nemá použitelný název.'] }
    const expeditions = list(r.expeditions, MAX_EXPEDITIONS)
      .map(sanitizeExpedition)
      .filter((x): x is Expedition => !!x)
    return { content: { v: 1, type: 'obsah', kind: 'dobrodruzstvi', adventure, expeditions }, errors }
  }
  if (r.kind === 'cizi-postava') {
    const npcs = list(r.npcs, MAX_NPCS).map(sanitizeNpc).filter((x): x is Npc => !!x)
    return npcs.length
      ? { content: { v: 1, type: 'obsah', kind: 'cizi-postava', npcs }, errors }
      : { errors: ['Zásilka neobsahuje použitelné cizí postavy.'] }
  }
  return { errors: ['Neznámý druh zásilky.'] }
}

// --- sestavení ---

/** Výprava bez rozpracovaného stavu a bez vazby na dobrodružství, s přiloženými cizími postavami z dobrodružství. */
export function buildExpeditionContent(e: Expedition, adventure?: Adventure): ExpeditionContent {
  const { adventureId: _a, castIds: _c, ...rest } = e
  const cast = castOf(e, adventure)
  return {
    v: CONTENT_VERSION,
    type: 'obsah',
    kind: 'vyprava',
    expedition: { ...rest, ...(cast.length ? { cast } : {}) },
  }
}

export function buildAdventureContent(a: Adventure, expeditions: readonly Expedition[]): AdventureContent {
  const own = expeditions.filter((e) => a.expeditionIds.includes(e.id))
  const ordered = a.expeditionIds.map((id) => own.find((e) => e.id === id)).filter((e): e is Expedition => !!e)
  return {
    v: CONTENT_VERSION,
    type: 'obsah',
    kind: 'dobrodruzstvi',
    adventure: a,
    expeditions: ordered.map((e) => {
      const { adventureId: _a, ...rest } = e
      return rest
    }),
  }
}

export const buildNpcContent = (npcs: readonly Npc[]): NpcContent => ({
  v: CONTENT_VERSION,
  type: 'obsah',
  kind: 'cizi-postava',
  npcs: [...npcs],
})

// --- příprava uložení (nová ID, nic se nepřepisuje) ---

/** Přeloží ID cizích postav v odkazech výpravy a jejích příhod. */
function remapExpedition(e: Expedition, ids: Map<string, string>, id: string, adventureId?: string): Expedition {
  const map = (x: string) => ids.get(x) ?? x
  const { adventureId: _a, ...rest } = e
  return {
    ...rest,
    id,
    ...(adventureId ? { adventureId } : {}),
    ...(e.castIds ? { castIds: e.castIds.map(map) } : {}),
    ...(e.cast ? { cast: e.cast.map((n) => ({ ...n, id: map(n.id) })) } : {}),
    incidents: e.incidents.map((i) => ({
      ...i,
      id: newId(),
      cast: i.cast.map((c) => (c.npcId ? { ...c, npcId: map(c.npcId) } : c)),
      ...(i.loot ? { loot: i.loot.map((l) => ({ ...l, id: newId() })) } : {}),
    })),
    nodes: e.nodes,
    created: now(),
    updated: now(),
  }
}

/** Nová ID postav `npcs`; vrací překladovou tabulku. */
function freshNpcIds(npcs: readonly Npc[]): Map<string, string> {
  return new Map(npcs.map((n) => [n.id, newId()]))
}

export interface ExpeditionPlan {
  expedition: Expedition
}
export interface AdventurePlan {
  adventure: Adventure
  expeditions: Expedition[]
}

/** Uzlové body zůstávají s původními ID: příhody na ně odkazují přes `stage`. */
export function planExpedition(c: ExpeditionContent): ExpeditionPlan {
  const ids = freshNpcIds(c.expedition.cast ?? [])
  return { expedition: remapExpedition(c.expedition, ids, newId()) }
}

export function planAdventure(c: AdventureContent): AdventurePlan {
  const adventureId = newId()
  const npcIds = freshNpcIds(c.adventure.cast ?? [])
  const expIds = new Map(c.expeditions.map((e) => [e.id, newId()]))
  // vlastní cizí postavy výprav dostanou taky nová ID (jinak by se při druhém importu srazily jen v rámci jedné výpravy)
  const expeditions = c.expeditions.map((e) => {
    const ids = new Map(npcIds)
    for (const n of e.cast ?? []) if (!ids.has(n.id)) ids.set(n.id, newId())
    return remapExpedition(e, ids, expIds.get(e.id)!, adventureId)
  })
  return {
    adventure: {
      ...c.adventure,
      id: adventureId,
      ...(c.adventure.cast ? { cast: c.adventure.cast.map((n) => ({ ...n, id: npcIds.get(n.id)! })) } : {}),
      expeditionIds: c.adventure.expeditionIds.map((x) => expIds.get(x)).filter((x): x is string => !!x),
      created: now(),
      updated: now(),
    },
    expeditions,
  }
}

/** Přidá cizí postavy k dobrodružství nebo výpravě (vždy s novými ID). */
export function addNpcsTo<T extends Adventure | Expedition>(target: T, npcs: readonly Npc[]): T {
  return { ...target, cast: [...(target.cast ?? []), ...npcs.map((n) => ({ ...n, id: newId() }))] }
}

/** Souhrn zásilky pro potvrzení příjemcem. */
export function describeContent(c: Content): { title: string; lines: string[] } {
  if (c.kind === 'vyprava') {
    const e = c.expedition
    return {
      title: `Výprava ${e.name}`,
      lines: [`Uzlové body: ${e.nodes.length}, příhody: ${e.incidents.length}, cizí postavy: ${(e.cast ?? []).length}.`],
    }
  }
  if (c.kind === 'dobrodruzstvi') {
    const inc = c.expeditions.reduce((n, e) => n + e.incidents.length, 0)
    return {
      title: `Dobrodružství ${c.adventure.name}`,
      lines: [
        `Výpravy: ${c.expeditions.length}, příhody: ${inc}, cizí postavy: ${(c.adventure.cast ?? []).length}.`,
        ...c.expeditions.map((e) => `• ${e.name}`),
      ],
    }
  }
  return { title: `Cizí postavy (${c.npcs.length})`, lines: c.npcs.map((n) => `• ${n.name}${n.group ? ` (${n.group})` : ''}`) }
}
