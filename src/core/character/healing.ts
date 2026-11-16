// Hojení jizev: jizva se časem zahojí (mezi výpravami o tom rozhoduje Průvodce, závažnější se hojí postupně) nebo ji
// vyléčí vhodná dovednost. Aplikace jen zapíše výsledek: snížení závažnosti o 1, nebo úplné zahojení.
import type { Attribute } from '../content/schema'
import { ATTRIBUTES, type Character } from './model'
import { effectiveAttributes, type Spent } from './play'

/** Zmírní jizvu o jeden stupeň závažnosti; jizva se závažností 1 se zahojí úplně. Neznámé ID nic nezmění. */
export function easeScar(c: Character, scarId: string): Character {
  return {
    ...c,
    scars: c.scars.flatMap((s) =>
      s.id !== scarId ? [s] : s.severity > 1 ? [{ ...s, severity: s.severity - 1 }] : [],
    ),
  }
}

/** Zahojí jizvu úplně. */
export const healScar = (c: Character, scarId: string): Character => ({
  ...c,
  scars: c.scars.filter((s) => s.id !== scarId),
})

export const MAX_SCAR = 5

export type Inflicted = { character: Character; gain: number } | { error: string }

/**
 * Zasadí postavě jizvu. Jako následek akce (`self` = false) se zapíše vždy; když si ji hráč zasadí sám kvůli Zdrojům,
 * získá závažnost + 2 Zdroje (musí je utratit v téže akci) a zdatnost vlastnosti přitom nesmí klesnout pod 0.
 */
export function inflictScar(
  c: Character,
  scar: { attribute: Attribute; severity: number; note: string },
  self: boolean,
  id: string,
): Inflicted {
  const severity = Math.min(MAX_SCAR, Math.max(1, Math.floor(scar.severity)))
  if (self && severity > effectiveAttributes(c)[scar.attribute])
    return { error: `Zdatnost (${scar.attribute}) by klesla pod 0.` }
  return {
    character: {
      ...c,
      scars: [...c.scars, { id, attribute: scar.attribute, severity, note: scar.note.trim() }],
    },
    gain: self ? severity + 2 : 0,
  }
}

// --- léčení v magickém okamžiku (dialog „Léčit“): cena, omezení a zápis ---

/** Cena léčení: Zdrojů za každé snížení závažnosti Jizvy o 1. */
export const COST_PER_STEP = 5
/** Nejvyšší síla magického okamžiku, kterou dialog nabízí. */
export const MAX_STRENGTH = 5

export interface HealInput {
  /** síla magického okamžiku (léčit lze Jizvy do této závažnosti) */
  strength: number
  /** o kolik stupňů se závažnost sníží (rovná-li se závažnosti, Jizva se zahojí) */
  steps: number
  /** Zdroje dodané lektvarem, mastí a podobně (z cizí nebo vlastní zásoby): snižují platbu ošetřovaného */
  potion: number
}

export interface HealPlan {
  steps: number
  cost: number
  potion: number
  /** kolik Zdrojů platí ošetřovaný ze svých */
  own: number
  /** rozdělení vlastní platby mezi vlastnosti (Zdroje vlastnosti Jizvy první, zbytek z ostatních) */
  pay: Record<Attribute, number>
  /** nová závažnost Jizvy (0 = zahojena) */
  after: number
}

export type Planned = { plan: HealPlan } | { error: string }

/** Kolik Zdrojů má vlastnost k dispozici pro léčení: jen vlastní nevyčerpané (ne Výhoda ani dočasné ze sebezasazené Jizvy). */
export const ownLeft = (c: Character, spent: Spent, a: Attribute): number =>
  Math.max(0, effectiveAttributes(c)[a] - spent[a])

/**
 * Vyhodnotí léčení Jizvy: omezení síly okamžiku, cenu 5 Zdrojů za stupeň, odečet lektvaru a rozdělení vlastní platby.
 * Zdroje se berou z vlastnosti Jizvy, doplatek z ostatních (nejdřív z té, které zbývá víc). Výhodou ani další Jizvou platit nejde.
 */
export function planHeal(c: Character, spent: Spent, scarId: string, input: HealInput): Planned {
  const scar = c.scars.find((s) => s.id === scarId)
  if (!scar) return { error: 'Jizva neexistuje.' }
  if (scar.severity > input.strength)
    return {
      error: `Magický okamžik síly ${input.strength} uzdraví nejvýš Jizvu závažnosti ${input.strength} (tahle má ${scar.severity}).`,
    }
  const steps = Math.floor(input.steps)
  if (steps < 1 || steps > scar.severity) return { error: `Snížit lze o 1 až ${scar.severity}.` }
  const cost = steps * COST_PER_STEP
  const potion = Math.min(cost, Math.max(0, Math.floor(input.potion)))
  let rest = cost - potion
  const pay: Record<Attribute, number> = { Tělo: 0, Duše: 0, Vliv: 0 }
  const order = [
    scar.attribute,
    ...ATTRIBUTES.filter((a) => a !== scar.attribute).sort((a, b) => ownLeft(c, spent, b) - ownLeft(c, spent, a)),
  ]
  for (const a of order) {
    const take = Math.min(rest, ownLeft(c, spent, a))
    pay[a] = take
    rest -= take
  }
  if (rest > 0) return { error: `Ošetřovanému chybí ${rest} Zdrojů (vlastní Zdroje celkem nestačí).` }
  return { plan: { steps, cost, potion, own: cost - potion, pay, after: scar.severity - steps } }
}

/** Provede léčení: sníží závažnost Jizvy o `steps` (na 0 = zahojení) a zvýší čerpání Zdrojů o platbu. */
export function applyHeal(
  c: Character,
  spent: Spent,
  scarId: string,
  plan: HealPlan,
): { character: Character; spent: Spent } {
  let character = c
  for (let i = 0; i < plan.steps; i++) character = easeScar(character, scarId)
  const next = { ...spent }
  for (const a of ATTRIBUTES) next[a] = spent[a] + plan.pay[a]
  return { character, spent: next }
}
