// Balíčky příhod podle uzlových bodů (příprava výpravy, `PLAN-VYPRAVY.md`). Příhody mají `stage`:
// `''` = před prvním uzlovým bodem, ID uzlu = po tomto uzlu, `kdykoli` = lze uvést kdykoli. Pořadí v balíčku
// je pořadí v poli `incidents`. Všechny funkce jsou čisté: vrací novou výpravu a vstup nemění.
import { newId } from '../character/model'
import { ANYTIME, type Expedition, type Incident, type Node } from './model'

export const START = ''

export interface Deck {
  /** `''`, ID uzlu, nebo `kdykoli` */
  key: string
  title: string
  node?: Node
  incidents: Incident[]
}

const nodeName = (n: Node, i: number) => n.title.trim() || `Uzlový bod ${i + 1}`

/** Štítek balíčku pro výběr (stejné texty jako nadpisy balíčků). */
export function stageLabels(e: Pick<Expedition, 'nodes'>): { key: string; label: string }[] {
  return [
    { key: START, label: 'Na začátku (před prvním uzlovým bodem)' },
    ...e.nodes.map((n, i) => ({ key: n.id, label: `Po uzlovém bodě: ${nodeName(n, i)}` })),
    { key: ANYTIME, label: 'Kdykoli' },
  ]
}

/** Balíčky v pořadí příběhu: začátek, po každém uzlu, kdykoli. Příhoda s neznámým stupněm patří na začátek. */
export function decks(e: Expedition): Deck[] {
  const known = new Set<string>([START, ANYTIME, ...e.nodes.map((n) => n.id)])
  const stageOf = (i: Incident) => (known.has(i.stage) ? i.stage : START)
  const labels = stageLabels(e)
  return labels.map(({ key, label }) => ({
    key,
    title: label,
    node: e.nodes.find((n) => n.id === key),
    incidents: e.incidents.filter((i) => stageOf(i) === key),
  }))
}

export const emptyNode = (title = ''): Node => ({ id: newId(), title, text: '' })

export const emptyIncident = (stage = START): Incident => ({
  id: newId(),
  title: '',
  text: '',
  stage,
  cast: [],
  conditions: '',
  ifSuccess: '',
  ifFailure: '',
})

export const addNode = (e: Expedition, title = ''): Expedition => ({ ...e, nodes: [...e.nodes, emptyNode(title)] })

/** Odebere uzlový bod; jeho příhody se přesunou do předchozího balíčku (nebo na začátek). */
export function removeNode(e: Expedition, nodeId: string): Expedition {
  const i = e.nodes.findIndex((n) => n.id === nodeId)
  if (i < 0) return e
  const fallback = i > 0 ? e.nodes[i - 1].id : START
  return {
    ...e,
    nodes: e.nodes.filter((n) => n.id !== nodeId),
    incidents: e.incidents.map((x) => (x.stage === nodeId ? { ...x, stage: fallback } : x)),
  }
}

/** Posune uzlový bod o místo (balíčky se řadí podle uzlů, příhody zůstanou u svého uzlu). */
export function moveNode(e: Expedition, nodeId: string, dir: -1 | 1): Expedition {
  const i = e.nodes.findIndex((n) => n.id === nodeId)
  const j = i + dir
  if (i < 0 || j < 0 || j >= e.nodes.length) return e
  const nodes = [...e.nodes]
  ;[nodes[i], nodes[j]] = [nodes[j], nodes[i]]
  return { ...e, nodes }
}

export function addIncident(e: Expedition, stage = START): { expedition: Expedition; incident: Incident } {
  const incident = emptyIncident(stage)
  return { expedition: { ...e, incidents: [...e.incidents, incident] }, incident }
}

export const removeIncident = (e: Expedition, id: string): Expedition => ({
  ...e,
  incidents: e.incidents.filter((x) => x.id !== id),
})

/** Přesune příhodu do jiného balíčku (na jeho konec). */
export function setStage(e: Expedition, id: string, stage: string): Expedition {
  const x = e.incidents.find((i) => i.id === id)
  if (!x || x.stage === stage) return e
  return { ...e, incidents: [...e.incidents.filter((i) => i.id !== id), { ...x, stage }] }
}

/** Posune příhodu o místo v rámci jejího balíčku (přeskočí příhody jiných balíčků). */
export function moveIncident(e: Expedition, id: string, dir: -1 | 1): Expedition {
  const x = e.incidents.find((i) => i.id === id)
  if (!x) return e
  const deck = decks(e).find((d) => d.incidents.some((i) => i.id === id))
  if (!deck) return e
  const at = deck.incidents.findIndex((i) => i.id === id)
  const other = deck.incidents[at + dir]
  if (!other) return e
  const list = [...e.incidents]
  const a = list.findIndex((i) => i.id === id)
  const b = list.findIndex((i) => i.id === other.id)
  ;[list[a], list[b]] = [list[b], list[a]]
  return { ...e, incidents: list }
}

/** Opraví příhody s neznámým stupněm (smazaný uzel) a vrátí je na začátek. */
export function normalize(e: Expedition): Expedition {
  const known = new Set<string>([START, ANYTIME, ...e.nodes.map((n) => n.id)])
  if (e.incidents.every((i) => known.has(i.stage))) return e
  return { ...e, incidents: e.incidents.map((i) => (known.has(i.stage) ? i : { ...i, stage: START })) }
}

export const addCast = (i: Incident, name: string, creatureId?: string): Incident =>
  name.trim() ? { ...i, cast: [...i.cast, { name: name.trim(), ...(creatureId ? { creatureId } : {}) }] } : i

export const removeCast = (i: Incident, index: number): Incident => ({ ...i, cast: i.cast.filter((_, j) => j !== index) })

/** Kolik příhod je k dispozici před dalším uzlovým bodem (pro ukazatel tempa ve vedení). */
export const countIn = (e: Expedition, key: string): number => decks(e).find((d) => d.key === key)?.incidents.length ?? 0
