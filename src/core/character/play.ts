// Stav hry: čerpání Zdrojů (Tělo, Duše, Vliv) v průběhu sezení. Mění se často a týká se jen hráče, proto se
// neukládá do deníku revizí, ale jen v tomto zařízení. Nejvíc Zdrojů vlastnosti = zdatnost snížená o jizvy.
import { ATTRIBUTES, type Character } from './model'
import type { Attribute } from '../content/schema'

const KEY = (id: string) => `drd2-char-play:${id}`

export type Spent = Record<Attribute, number>
const empty = (): Spent => ({ Tělo: 0, Duše: 0, Vliv: 0 })

/** Zdatnost po jizvách: jizva snižuje zdatnost své vlastnosti o svou závažnost (nejméně na 0). */
export function effectiveAttributes(c: Character): Record<Attribute, number> {
  const out = { Tělo: 0, Duše: 0, Vliv: 0 } as Record<Attribute, number>
  for (const a of ATTRIBUTES) {
    const loss = c.scars.filter((s) => s.attribute === a).reduce((n, s) => n + s.severity, 0)
    out[a] = Math.max(0, c.attributes[a] - loss)
  }
  return out
}

export function loadSpent(id: string): Spent {
  const out = empty()
  try {
    const raw = JSON.parse(localStorage.getItem(KEY(id)) ?? '{}')
    for (const a of ATTRIBUTES) {
      const n = raw?.spent?.[a]
      if (typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 99) out[a] = n
    }
  } catch {
    /* výchozí hodnoty */
  }
  return out
}

export function saveSpent(id: string, spent: Spent) {
  try {
    localStorage.setItem(KEY(id), JSON.stringify({ spent }))
  } catch {
    /* čerpání platí aspoň do zavření stránky */
  }
}

/** Čerpání (kladné `by`) nebo obnova (záporné) jednoho Zdroje v mezích 0 až maximum. */
export function adjust(
  spent: Spent,
  max: Record<Attribute, number>,
  a: Attribute,
  by: number,
): Spent {
  return { ...spent, [a]: Math.min(max[a], Math.max(0, spent[a] + by)) }
}

/** Dočasné Zdroje ze sebezasazené jizvy (závažnost + 2): platí jen pro jednu akci, nespotřebované propadnou. */
export type Bonus = Record<Attribute, number>
export const emptyBonus = (): Bonus => ({ Tělo: 0, Duše: 0, Vliv: 0 })
const BONUS_KEY = (id: string) => `drd2-char-bonus:${id}`

export function loadBonus(id: string): Bonus {
  const out = emptyBonus()
  try {
    const raw = JSON.parse(localStorage.getItem(BONUS_KEY(id)) ?? '{}')
    for (const a of ATTRIBUTES) {
      const n = raw?.[a]
      if (typeof n === 'number' && Number.isInteger(n) && n > 0 && n <= 99) out[a] = n
    }
  } catch {
    /* žádné dočasné Zdroje */
  }
  return out
}

export function saveBonus(id: string, bonus: Bonus) {
  try {
    if (ATTRIBUTES.some((a) => bonus[a] > 0))
      localStorage.setItem(BONUS_KEY(id), JSON.stringify(bonus))
    else localStorage.removeItem(BONUS_KEY(id))
  } catch {
    /* dočasné Zdroje platí aspoň do zavření stránky */
  }
}

/** Ohrožení postavy: okolnosti, v nichž se nachází (neodvíjí se od jejích vlastností). Jen ve hře, v tomto zařízení. */
const THREAT_KEY = (id: string) => `drd2-char-threat:${id}`
export const MAX_THREAT = 20

export function loadThreat(id: string): number {
  try {
    const n = JSON.parse(localStorage.getItem(THREAT_KEY(id)) ?? '0')
    return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= MAX_THREAT ? n : 0
  } catch {
    return 0
  }
}

export function saveThreat(id: string, threat: number) {
  try {
    const n = Math.min(MAX_THREAT, Math.max(0, Math.floor(threat)))
    if (n > 0) localStorage.setItem(THREAT_KEY(id), String(n))
    else localStorage.removeItem(THREAT_KEY(id))
  } catch {
    /* Ohrožení platí aspoň do zavření stránky */
  }
}
