// Tabulka režimů přenosu seřazená od nejrobustnějšího po nejrychlejší. Výchozí je index 0.
// Zatím jen AFSK; PSK, QAM a OFDM se přidají jako další položky se stejným rozhraním (viz RADIOGRAM.md).
import type { AfskProfile } from './afsk'

export interface Mode {
  id: number
  name: string
  kind: 'afsk'
  afsk: AfskProfile
  /** nejnižší odstup signálu (dB v okně symbolu), od kterého je režim spolehlivý */
  minSnrDb: number
}

export const MODES: Mode[] = [
  { id: 0, name: 'AFSK 300', kind: 'afsk', afsk: { baud: 300, f0: 1200, f1: 2100 }, minSnrDb: 0 },
  { id: 1, name: 'AFSK 600', kind: 'afsk', afsk: { baud: 600, f0: 1200, f1: 2400 }, minSnrDb: 13 },
  { id: 2, name: 'AFSK 1200', kind: 'afsk', afsk: { baud: 1200, f0: 1200, f1: 2400 }, minSnrDb: 13 },
]

/** Režim, ve kterém probíhá volání a odpověď (vždy nejrobustnější). */
export const HANDSHAKE_MODE = MODES[0]

export const modeById = (id: number): Mode => MODES[Math.min(Math.max(id, 0), MODES.length - 1)]

/**
 * Z odstupu signálu naměřeného při volání v režimu 0 odhadne nejrychlejší režim, který ještě obstojí.
 * Odstup v okně symbolu klesá s rychlostí nepřímo úměrně (stejný šum, kratší okno).
 */
export function chooseMode(snrDb: number, maxMode = MODES.length - 1, marginDb = 2): Mode {
  let best = MODES[0]
  for (const m of MODES) {
    if (m.id > maxMode) break
    const predicted = snrDb - 10 * Math.log10(m.afsk.baud / HANDSHAKE_MODE.afsk.baud)
    if (predicted - marginDb >= m.minSnrDb) best = m
  }
  return best
}
