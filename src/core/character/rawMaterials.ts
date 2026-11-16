// Suroviny postavy: počet bez druhu a volitelné druhy (značka + název + počet). Pravidla Suroviny druhy nerozlišují,
// druhy jsou volba skupiny (aby šlo vysvětlit, kde je postava získala). Čistě funkce nad postavou, žádné úložiště.
import { newId, type Character, type RawMaterialKind } from './model'

export const MAX_RAW = 9999
export const MAX_KINDS = 30
export const MAX_NAME = 40
/** Nejvíc „viditelných znaků“ ve značce (emotikona s více body unicode se počítá jako jeden). */
export const MAX_MARK = 2

/** Ukazatel „na který druh se vztahuje změna“: ID druhu, nebo `undefined` pro Suroviny bez druhu. */
export type KindRef = string | undefined

const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : undefined

/** Počet viditelných znaků (grafémů); emotikona typu „👨‍👩‍👧“ se počítá jako jeden. */
export function markLength(s: string): number {
  return segmenter ? [...segmenter.segment(s)].length : Array.from(s).length
}

/** Značka bez okolních mezer, nejvýš `MAX_MARK` viditelných znaků a rozumná délka; jinak prázdný řetězec. */
export function cleanMark(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  const s = raw.trim()
  if (!s || s.length > 16 || markLength(s) > MAX_MARK) return ''
  return s
}

export const cleanName = (raw: unknown): string =>
  typeof raw === 'string' ? raw.trim().slice(0, MAX_NAME) : ''

export const cleanCount = (raw: unknown): number =>
  typeof raw === 'number' && Number.isFinite(raw) ? Math.min(MAX_RAW, Math.max(0, Math.floor(raw))) : 0

/** Druhy v pořadí vzniku (ID se podle času vytvoření řadí samo). */
export const kindsOf = (c: Character): { id: string; kind: RawMaterialKind }[] =>
  Object.entries(c.rawMaterialKinds ?? {})
    .map(([id, kind]) => ({ id, kind }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

/** Evidují se druhy? Pak se v přehledu ukazuje součet a počty jednotlivých druhů. */
export const hasKinds = (c: Character): boolean => Object.keys(c.rawMaterialKinds ?? {}).length > 0

/** Suroviny celkem (bez druhu i všechny druhy). */
export const rawTotal = (c: Character): number =>
  (c.rawMaterials ?? 0) + kindsOf(c).reduce((n, { kind }) => n + kind.count, 0)

/** Počet Surovin daného druhu (nebo bez druhu). */
export const rawCount = (c: Character, ref: KindRef): number =>
  ref === undefined ? (c.rawMaterials ?? 0) : (c.rawMaterialKinds?.[ref]?.count ?? 0)

/** Přičte (nebo odečte) Suroviny; počet se drží v mezích 0 až `MAX_RAW`. Neznámý druh nic nezmění. */
export function adjustRaw(c: Character, ref: KindRef, by: number): Character {
  if (ref === undefined) return { ...c, rawMaterials: cleanCount((c.rawMaterials ?? 0) + by) }
  const kind = c.rawMaterialKinds?.[ref]
  if (!kind) return c
  return {
    ...c,
    rawMaterialKinds: { ...c.rawMaterialKinds, [ref]: { ...kind, count: cleanCount(kind.count + by) } },
  }
}

export type Edited = { character: Character } | { error: string }

const clash = (c: Character, mark: string, name: string, except?: string): string => {
  for (const { id, kind } of kindsOf(c)) {
    if (id === except) continue
    if (kind.mark === mark && mark) return `Značka ${mark} už patří druhu „${kind.name}“.`
    if (name && kind.name.trim().toLowerCase() === name.toLowerCase())
      return `Druh „${kind.name}“ už existuje.`
  }
  return ''
}

/** Přidá druh (s nulovým počtem); značka i název mohou být prázdné jen jedno z nich, ne obě. */
export function addKind(c: Character, markRaw: string, nameRaw: string, id: string = newId()): Edited {
  const mark = cleanMark(markRaw)
  const name = cleanName(nameRaw)
  if (markRaw.trim() && !mark) return { error: `Značka smí mít nejvýš ${MAX_MARK} znaky (stačí i emotikona).` }
  if (!mark && !name) return { error: 'Zadejte značku nebo název druhu.' }
  if (Object.keys(c.rawMaterialKinds ?? {}).length >= MAX_KINDS)
    return { error: `Druhů může být nejvýš ${MAX_KINDS}.` }
  const problem = clash(c, mark, name)
  if (problem) return { error: problem }
  return {
    character: { ...c, rawMaterialKinds: { ...c.rawMaterialKinds, [id]: { mark, name, count: 0 } } },
  }
}

/** Změní značku a název druhu (počet zůstane). */
export function renameKind(c: Character, id: string, markRaw: string, nameRaw: string): Edited {
  const kind = c.rawMaterialKinds?.[id]
  if (!kind) return { error: 'Druh neexistuje.' }
  const mark = cleanMark(markRaw)
  const name = cleanName(nameRaw)
  if (markRaw.trim() && !mark) return { error: `Značka smí mít nejvýš ${MAX_MARK} znaky (stačí i emotikona).` }
  if (!mark && !name) return { error: 'Zadejte značku nebo název druhu.' }
  const problem = clash(c, mark, name, id)
  if (problem) return { error: problem }
  return { character: { ...c, rawMaterialKinds: { ...c.rawMaterialKinds, [id]: { ...kind, mark, name } } } }
}

/** Smaže druh, ale jen s nulovým počtem (jinak by Suroviny zmizely beze stopy). */
export function removeKind(c: Character, id: string): Edited {
  const kind = c.rawMaterialKinds?.[id]
  if (!kind) return { error: 'Druh neexistuje.' }
  if (kind.count > 0)
    return { error: `Druh „${kind.name || kind.mark}“ má ještě ${kind.count} Surovin, nejdřív je spotřebujte nebo přesuňte.` }
  const rest = { ...c.rawMaterialKinds }
  delete rest[id]
  return { character: { ...c, rawMaterialKinds: rest } }
}

/** Zkrácený popis druhu pro přehled: značka, jinak název. */
export const kindLabel = (k: RawMaterialKind): string => k.mark || k.name

/** Plný popis druhu: „🌿 byliny“. */
export const kindFull = (k: RawMaterialKind): string => [k.mark, k.name].filter(Boolean).join(' ')

/** Kontrola dat neznámého původu: platný objekt druhů (nejvýš `MAX_KINDS`), jinak prázdný. */
export function kindsFrom(raw: unknown): Record<string, RawMaterialKind> {
  const out: Record<string, RawMaterialKind> = {}
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return out
  for (const [id, v] of Object.entries(raw).slice(0, MAX_KINDS)) {
    const k = kindFrom(v)
    if (k && id.length > 0 && id.length <= 100 && !id.includes('.')) out[id] = k
  }
  return out
}

/** Jeden platný druh z hodnoty neznámého původu, nebo `undefined`. */
export function kindFrom(v: unknown): RawMaterialKind | undefined {
  if (typeof v !== 'object' || v === null) return undefined
  const r = v as Record<string, unknown>
  const mark = cleanMark(r.mark)
  const name = cleanName(r.name)
  if (!mark && !name) return undefined
  return { mark, name, count: cleanCount(r.count) }
}
