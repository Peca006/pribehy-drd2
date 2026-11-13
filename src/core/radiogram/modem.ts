// Společné rozhraní modemů (AFSK, PSK/QAM, OFDM): všechny berou rámce (obsah zpráv protokolu) a vrací zvuk,
// a naopak. Rámcování, CRC a Reed–Solomon jsou společné (frame.ts), modemy řeší jen převod bitů na zvuk.

export const SAMPLE_RATE = 48000

export interface Demodulated {
  /** obsahy rámců s platným CRC v pořadí, jak přišly */
  frames: Uint8Array[]
  /** odhad poměru energie signálu k šumu v okně jednoho symbolu (lineárně), jen u AFSK */
  snr?: number
  /** kolik synchronizací bylo nalezeno (i s neplatným rámcem) */
  syncs: number
  /** kolik bajtů celkem opravil Reed–Solomon */
  corrected: number
}

export interface Modem {
  /** Zvuk pro několik rámců za sebou (jedno vysílání). */
  modulate(frames: Uint8Array[], fs?: number): Float32Array
  /** Najde a dekóduje všechny rámce v nahrávce. */
  demodulate(x: Float32Array, fs?: number): Demodulated
  /** Doba vysílání jednoho rámce s daným obsahem (s). */
  airtime(payloadBytes: number): number
}

/** Ticho před vysíláním (reproduktor se „rozběhne“) a mezi rámci, s */
export const LEAD = 0.12
export const GAP = 0.02
export const AMPLITUDE = 0.7

/** Spojí kusy zvuku s tichem na začátku, mezi nimi a na konci. */
export function assemble(parts: Float32Array[], fs: number): Float32Array {
  const lead = Math.round(LEAD * fs)
  const gap = Math.round(GAP * fs)
  const out = new Float32Array(lead * 2 + parts.reduce((s, a) => s + a.length + gap, 0))
  let at = lead
  for (const a of parts) {
    out.set(a, at)
    at += a.length + gap
  }
  return out
}

/** Krátký náběh a doběh amplitudy proti lupnutí (na místě). */
export function ramp(x: Float32Array, fs: number, seconds = 0.002) {
  const r = Math.round(seconds * fs)
  for (let i = 0; i < r && i < x.length; i++) {
    const g = i / r
    x[i] *= g
    x[x.length - 1 - i] *= g
  }
}

export function bytesToBits(b: Uint8Array): number[] {
  const out: number[] = []
  for (const v of b) for (let i = 7; i >= 0; i--) out.push((v >> i) & 1)
  return out
}
