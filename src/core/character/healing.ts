// Hojení jizev: jizva se časem zahojí (mezi výpravami o tom rozhoduje Průvodce, závažnější se hojí postupně) nebo ji
// vyléčí vhodná dovednost. Aplikace jen zapíše výsledek: snížení závažnosti o 1, nebo úplné zahojení.
import type { Attribute } from '../content/schema'
import type { Character } from './model'
import { effectiveAttributes } from './play'

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
