// Tabulka režimů přenosu seřazená podle rychlosti (od nejrobustnějšího po nejrychlejší). Výchozí je index 0.
// Každý režim je modem (AFSK, PSK, QAM, OFDM) s Reed–Solomonem; viz `FEC`.
import { afskModem } from './afsk'
import { linearModem } from './linear'
import type { Modem } from './modem'
import { ofdmModem } from './ofdm'

/** Počet kontrolních bajtů Reed–Solomon v každém rámci (opraví 8 chybných bajtů z ~70). */
export const FEC = 16

export interface Mode {
  id: number
  name: string
  kind: 'afsk' | 'psk' | 'qam' | 'ofdm'
  /** hrubá rychlost v bitech za sekundu (bez rámcování a kontrolních bajtů) */
  bitrate: number
  /**
   * nejnižší odstup signálu, od kterého je režim spolehlivý, vyjádřený v dB jako odstup naměřený při volání
   * v režimu 0 (AFSK 300; energie symbolu k výkonu šumu na vzorek, viz `esn0`). Změřeno v testech.
   */
  minSnrDb: number
  modem: Modem
}

const lin = (kind: 'bpsk' | 'qpsk' | 'psk8' | 'qam16', baud: number) => {
  // nosná je násobek baud/2 poblíž 3 kHz: dvojnásobná frekvence se v okně symbolu přesně vystřídá
  const fc = Math.round(3000 / (baud / 2)) * (baud / 2)
  return linearModem({ kind, baud, fc }, FEC)
}

export const MODES: Mode[] = [
  { id: 0, name: 'AFSK 300', kind: 'afsk', bitrate: 300, minSnrDb: 0, modem: afskModem({ baud: 300, f0: 1200, f1: 2100 }, FEC) },
  { id: 1, name: 'AFSK 600', kind: 'afsk', bitrate: 600, minSnrDb: 14, modem: afskModem({ baud: 600, f0: 1200, f1: 2400 }, FEC) },
  { id: 2, name: 'BPSK 800', kind: 'psk', bitrate: 800, minSnrDb: 11, modem: lin('bpsk', 800) },
  { id: 3, name: 'AFSK 1200', kind: 'afsk', bitrate: 1200, minSnrDb: 17, modem: afskModem({ baud: 1200, f0: 1200, f1: 2400 }, FEC) },
  { id: 4, name: 'QPSK 1200', kind: 'psk', bitrate: 2400, minSnrDb: 16, modem: lin('qpsk', 1200) },
  { id: 5, name: '8-PSK 1200', kind: 'psk', bitrate: 3600, minSnrDb: 22, modem: lin('psk8', 1200) },
  { id: 6, name: '16-QAM 1200', kind: 'qam', bitrate: 4800, minSnrDb: 22, modem: lin('qam16', 1200) },
  { id: 7, name: 'OFDM QPSK', kind: 'ofdm', bitrate: 5000, minSnrDb: 30.5, modem: ofdmModem({ kind: 'qpsk' }, FEC) },
  { id: 8, name: 'OFDM 16-QAM', kind: 'ofdm', bitrate: 10000, minSnrDb: 39, modem: ofdmModem({ kind: 'qam16' }, FEC) },
]

/** Režim, ve kterém probíhá volání a odpověď (vždy nejrobustnější). */
export const HANDSHAKE_MODE = MODES[0]

/** Hodnota pole „režim“ ve volání: nechat zvolit podle kvality kanálu. */
export const AUTO_MODE = 255

export const modeById = (id: number): Mode => MODES[Math.min(Math.max(id, 0), MODES.length - 1)]

/** Pomalejší sousední režim (nebo stejný, když už je nejpomalejší). */
export const slower = (m: Mode): Mode => MODES[Math.max(0, m.id - 1)]

/** Odstup naměřený v režimu 0 (dB) z úrovně šumu: energie symbolu 300 Bd při amplitudě 0,7 ku šumu `sigma` na vzorek. */
export const esn0 = (sigma: number, amplitude = 0.7, fs = 48000) =>
  10 * Math.log10((amplitude * amplitude * (fs / 300)) / (4 * sigma * sigma))

/**
 * Z odstupu signálu naměřeného při volání v režimu 0 vybere nejrychlejší režim (nejvyšší hrubá rychlost),
 * který ještě obstojí s rezervou `marginDb`; režimy nad `maxMode` se nezkoušejí.
 */
export function chooseMode(snrDb: number, maxMode = MODES.length - 1, marginDb = 2): Mode {
  let best = MODES[0]
  for (const m of MODES) {
    if (m.id > maxMode) break
    if (snrDb - marginDb >= m.minSnrDb && m.bitrate > best.bitrate) best = m
  }
  return best
}
