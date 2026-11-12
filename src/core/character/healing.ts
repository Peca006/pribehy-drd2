// Hojení jizev: jizva se časem zahojí (mezi výpravami o tom rozhoduje Průvodce, závažnější se hojí postupně) nebo ji
// vyléčí vhodná dovednost. Aplikace jen zapíše výsledek: snížení závažnosti o 1, nebo úplné zahojení.
import type { Character } from './model'

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
