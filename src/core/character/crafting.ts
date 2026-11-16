// Výroba a opravy: cena v Surovinách, rozdělení spotřeby mezi druhy Surovin a zápis výsledku. Aplikace jen počítá a zapisuje,
// o podmínkách (místo, čas, pomůcky) a o výsledku rozhoduje hra. Čísla z pravidel jsou návrh, který jde přepsat.
import type { Attribute } from '../content/schema'
import type { Character } from './model'
import { potionFrom, savePotion } from './potions'
import { cleanCount, kindsOf, MAX_RAW, rawCount, type KindRef } from './rawMaterials'

export type CraftKind = 'vyroba' | 'oprava' | 'nouzovy' | 'lektvar'

/** Výsledek: úspěch (Suroviny se spotřebují, předmět vznikne), neúspěch (Suroviny propadnou), přerušeno (nic se nespotřebuje). */
export type CraftResult = 'uspech' | 'neuspech' | 'preruseno'

/** Oprava: Surovin za každý stupeň závažnosti poškození. */
export const REPAIR_PER_SEVERITY = 5
export const MAX_SEVERITY = 5

/** Návrh ceny v Surovinách: výroba zhruba polovina ceny předmětu v groších (nahoru), oprava 5 za stupeň, nouzový předmět nic. */
export function suggestCost(kind: CraftKind, priceGroschen: number, severity: number): number {
  if (kind === 'nouzovy') return 0
  if (kind === 'lektvar') return 3
  if (kind === 'oprava') return REPAIR_PER_SEVERITY * Math.min(MAX_SEVERITY, Math.max(1, Math.floor(severity)))
  return Math.ceil(Math.max(0, Math.floor(priceGroschen)) / 2)
}

/** Rozdělení spotřeby: klíč `''` = Suroviny bez druhu, jinak ID druhu. */
export type Alloc = Record<string, number>
const keyOf = (ref: KindRef) => ref ?? ''
const refOf = (key: string): KindRef => (key === '' ? undefined : key)

/** Suroviny dostupné k rozdělení: bez druhu a po druzích (v pořadí vzniku). */
export const sources = (c: Character): { key: string; have: number }[] => [
  { key: '', have: rawCount(c, undefined) },
  ...kindsOf(c).map(({ id, kind }) => ({ key: id, have: kind.count })),
]

/** Výchozí rozdělení nákladu: nejdřív Suroviny bez druhu, pak druhy v pořadí vzniku. Co se nevejde, zůstane nerozdělené. */
export function autoAlloc(c: Character, cost: number): Alloc {
  const out: Alloc = {}
  let rest = Math.max(0, cost)
  for (const { key, have } of sources(c)) {
    const take = Math.min(rest, have)
    if (take) out[key] = take
    rest -= take
  }
  return out
}

export interface CraftInput {
  kind: CraftKind
  /** název předmětu (nepovinný u opravy) */
  name: string
  /** cena v Surovinách (hotová hodnota, i ručně upravená) */
  cost: number
  alloc: Alloc
  result: CraftResult
  /** přidat vyrobený předmět do výbavy (jen výroba a nouzový předmět a jen při úspěchu) */
  addToEquipment: boolean
  /** lektvar: na co je (vlastnost a druh Jizvy); počet Surovin v něm je cena */
  potion?: { attribute: Attribute; scar: string; note?: string }
}

export interface CraftCheck {
  /** kolik Surovin se skutečně spotřebuje (0 při přerušení a u nouzového předmětu) */
  spend: number
  /** kolik z ceny je ještě třeba rozdělit mezi druhy (kladné = chybí, záporné = přebývá) */
  toAssign: number
  error: string
}

const consumes = (i: CraftInput) => i.kind !== 'nouzovy' && i.result !== 'preruseno'

/** Zkontroluje zadání: meze, součet rozdělení a dostatek Surovin každého druhu. */
export function checkCraft(c: Character, input: CraftInput): CraftCheck {
  const cost = input.kind === 'nouzovy' ? 0 : Math.floor(input.cost)
  if (!Number.isFinite(cost) || cost < 0 || cost > MAX_RAW) return { spend: 0, toAssign: 0, error: 'Cena musí být celé číslo od 0.' }
  if (input.kind === 'lektvar') {
    if (!potionFrom({ ...input.potion, count: 1 })) return { spend: 0, toAssign: 0, error: 'Zadejte, na jakou Jizvu lektvar působí.' }
    if (cost < 1 && input.result !== 'preruseno') return { spend: 0, toAssign: 0, error: 'Lektvar potřebuje aspoň 1 Surovinu.' }
  }
  if (!consumes(input)) return { spend: 0, toAssign: 0, error: '' }
  let assigned = 0
  for (const [key, n] of Object.entries(input.alloc)) {
    if (!Number.isInteger(n) || n < 0) return { spend: cost, toAssign: 0, error: 'Počty Surovin musí být nezáporná celá čísla.' }
    if (key !== '' && !c.rawMaterialKinds?.[key]) return { spend: cost, toAssign: 0, error: 'Neznámý druh Surovin.' }
    if (n > rawCount(c, refOf(key))) return { spend: cost, toAssign: 0, error: 'Postava nemá tolik Surovin tohoto druhu.' }
    assigned += n
  }
  const toAssign = cost - assigned
  const error =
    toAssign > 0 ? `Zbývá rozdělit ${toAssign} Surovin.` : toAssign < 0 ? `Rozděleno o ${-toAssign} Surovin víc, než je cena.` : ''
  return { spend: cost, toAssign, error }
}

/** Provede výrobu nebo opravu: odečte Suroviny podle rozdělení a při úspěchu výroby přidá předmět do výbavy. Neplatné zadání nic nezmění. */
export function applyCraft(c: Character, input: CraftInput): Character {
  if (checkCraft(c, input).error) return c
  let next = c
  if (consumes(input)) {
    let general = c.rawMaterials ?? 0
    const kinds = { ...c.rawMaterialKinds }
    for (const [key, n] of Object.entries(input.alloc)) {
      if (!n) continue
      if (key === '') general = cleanCount(general - n)
      else kinds[key] = { ...kinds[key], count: cleanCount(kinds[key].count - n) }
    }
    next = { ...c, rawMaterials: general, rawMaterialKinds: kinds }
  }
  if (input.kind === 'lektvar' && input.result === 'uspech') {
    const r = savePotion(next, { ...input.potion, count: Math.floor(input.cost) })
    if ('character' in r) next = r.character
  }
  const made = input.kind === 'vyroba' && input.addToEquipment && input.name.trim() && input.result === 'uspech'
  if (made || (input.kind === 'nouzovy' && input.addToEquipment && input.name.trim())) {
    const label = input.kind === 'nouzovy' ? `${input.name.trim()} (nouzový)` : input.name.trim()
    next = { ...next, equipment: [...next.equipment, label.slice(0, 500)] }
  }
  return next
}

const KIND_TEXT: Record<CraftKind, string> = {
  vyroba: 'Výroba',
  oprava: 'Oprava',
  nouzovy: 'Nouzový předmět',
  lektvar: 'Lektvar',
}
const RESULT_TEXT: Record<CraftResult, string> = {
  uspech: 'podařilo se',
  neuspech: 'nepodařilo se, Suroviny propadly',
  preruseno: 'přerušeno, nic se nespotřebovalo',
}

/** Poznámka k revizi, např. „Výroba: provazový žebřík (4 Surovin: bez druhu 2, 🌿 2), podařilo se“. */
export function craftNote(c: Character, input: CraftInput, labelOf: (key: string) => string): string {
  const spend = checkCraft(c, input).spend
  const used = Object.entries(input.alloc)
    .filter(([, n]) => n > 0)
    .map(([key, n]) => `${labelOf(key)} ${n}`)
    .join(', ')
  const what =
    input.kind === 'lektvar' && input.potion
      ? `: ${input.potion.scar} (${input.potion.attribute})`
      : input.name.trim()
        ? `: ${input.name.trim()}`
        : ''
  const cost = input.kind === 'nouzovy' ? '' : ` (${spend} Surovin${used ? `: ${used}` : ''})`
  const result = input.kind === 'nouzovy' || input.result === 'uspech' ? '' : `, ${RESULT_TEXT[input.result]}`
  return `${KIND_TEXT[input.kind]}${what}${cost}${result}`
}
