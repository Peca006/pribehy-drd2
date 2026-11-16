// Hojení jizev: jizva se časem zahojí (mezi výpravami o tom rozhoduje Průvodce, závažnější se hojí postupně) nebo ji
// vyléčí vhodná dovednost. Aplikace jen zapíše výsledek: snížení závažnosti o 1, nebo úplné zahojení.
import type { Attribute } from '../content/schema'
import { ATTRIBUTES, type Character } from './model'
import { consumePotions } from './potions'
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

// --- zmírnění Jizvy léčením (dialog „Zmírnit“): cena, platba po vlastnostech a zápis ---

/** Cena léčení: Zdrojů za každé snížení závažnosti Jizvy o 1. */
export const COST_PER_STEP = 5

/** O kolik stupňů lze Jizvu zmírnit: 1 až (závažnost − 1); úplné zahojení je samostatná akce („Zahojeno“). */
export const maxSteps = (severity: number): number => Math.max(0, severity - 1)

/** Cena zmírnění o `steps` stupňů ve Zdrojích. */
export const healCost = (steps: number): number => steps * COST_PER_STEP

/** Kolik Zdrojů má vlastnost k dispozici pro léčení: jen vlastní nevyčerpané (ne Výhoda ani dočasné ze sebezasazené Jizvy). */
export const ownLeft = (c: Character, spent: Spent, a: Attribute): number =>
  Math.max(0, effectiveAttributes(c)[a] - spent[a])

export type Pay = Record<Attribute, number>
export const noPay = (): Pay => ({ Tělo: 0, Duše: 0, Vliv: 0 })

/**
 * Výchozí rozdělení vlastní platby `own` Zdrojů: nejdřív Zdroje vlastnosti Jizvy, doplatek z ostatních (nejdřív z té,
 * které zbývá víc). Nestačí-li Zdroje, vrátí, co se dalo rozdělit (zbytek zůstane nezaplacený).
 */
export function autoPay(c: Character, spent: Spent, scarId: string, own: number): Pay {
  const pay = noPay()
  const scar = c.scars.find((s) => s.id === scarId)
  if (!scar) return pay
  let rest = own
  const order = [
    scar.attribute,
    ...ATTRIBUTES.filter((a) => a !== scar.attribute).sort((a, b) => ownLeft(c, spent, b) - ownLeft(c, spent, a)),
  ]
  for (const a of order) {
    const take = Math.min(rest, ownLeft(c, spent, a))
    pay[a] = take
    rest -= take
  }
  return pay
}

export interface HealInput {
  /** o kolik stupňů se závažnost sníží (1 až závažnost − 1) */
  steps: number
  /** Zdroje dodané cizím lektvarem, mastí a podobně (mimo evidenci postavy): snižují platbu (nejvýš cena) */
  potion: number
  /** Suroviny z vlastních evidovaných lektvarů (ID → kolik); po uložení se z nich odečtou */
  potionUse?: Record<string, number>
  /** rozdělení vlastní platby mezi vlastnosti (součet musí být cena − lektvar) */
  pay: Pay
  /** nový popis Jizvy (prázdný = beze změny) */
  note?: string
}

export interface HealCheck {
  cost: number
  potion: number
  /** kolik Zdrojů má zaplatit ošetřovaný ze svých */
  own: number
  /** kolik z toho je ještě třeba rozdělit mezi vlastnosti (kladné = chybí, záporné = přebývá) */
  toAssign: number
  /** nová závažnost Jizvy */
  after: number
  error: string
}

/** Zkontroluje zadané zmírnění (meze, rozdělení platby, dostatek Zdrojů); `error` je prázdná, když je vše v pořádku. */
export function checkHeal(c: Character, spent: Spent, scarId: string, input: HealInput): HealCheck {
  const scar = c.scars.find((s) => s.id === scarId)
  const bad = (error: string): HealCheck => ({ cost: 0, potion: 0, own: 0, toAssign: 0, after: 0, error })
  if (!scar) return bad('Jizva neexistuje.')
  const limit = maxSteps(scar.severity)
  if (limit < 1) return bad('Jizvu se závažností 1 lze už jen zahojit.')
  const steps = Math.floor(input.steps)
  if (steps < 1 || steps > limit) return bad(`Snížit lze o 1 až ${limit}.`)
  const cost = healCost(steps)
  let used = 0
  for (const [id, n] of Object.entries(input.potionUse ?? {})) {
    if (!(n > 0)) continue
    const have = c.potions?.[id]?.count ?? 0
    if (!Number.isInteger(n) || n > have) return bad('Lektvar nemá tolik Surovin.')
    used += n
  }
  if (used > cost) return bad(`Z lektvarů je ${used} Zdrojů, ale cena je jen ${cost}.`)
  const potion = Math.min(cost, used + Math.max(0, Math.floor(input.potion)))
  const own = cost - potion
  const assigned = ATTRIBUTES.reduce((n, a) => n + input.pay[a], 0)
  const toAssign = own - assigned
  let error = ''
  for (const a of ATTRIBUTES)
    if (input.pay[a] < 0 || input.pay[a] > ownLeft(c, spent, a)) {
      error = `${a}: nelze zaplatit ${input.pay[a]} (zbývá ${ownLeft(c, spent, a)}).`
      break
    }
  if (!error && toAssign > 0) error = `Zbývá rozdělit ${toAssign} Zdrojů mezi vlastnosti.`
  if (!error && toAssign < 0) error = `Rozděleno o ${-toAssign} Zdrojů víc, než je třeba.`
  return { cost, potion, own, toAssign, after: scar.severity - steps, error }
}

/** Provede zmírnění: sníží závažnost, případně změní popis Jizvy a zvýší čerpání Zdrojů o platbu. Neplatný vstup nic nezmění. */
export function applyHeal(
  c: Character,
  spent: Spent,
  scarId: string,
  input: HealInput,
): { character: Character; spent: Spent } {
  const check = checkHeal(c, spent, scarId, input)
  if (check.error) return { character: c, spent }
  const note = input.note?.trim().slice(0, 300)
  const character = {
    ...c,
    scars: c.scars.map((s) =>
      s.id !== scarId ? s : { ...s, severity: check.after, note: note === undefined ? s.note : note },
    ),
  }
  const next = { ...spent }
  for (const a of ATTRIBUTES) next[a] = spent[a] + input.pay[a]
  return { character: input.potionUse ? consumePotions(character, input.potionUse) : character, spent: next }
}
