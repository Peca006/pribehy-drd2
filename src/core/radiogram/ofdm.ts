// OFDM v zvukovém pásmu: 512bodová FFT, cyklický prefix 64 vzorků, 36 podnosných (čísla 16…51, tedy asi
// 1,5–4,9 kHz při 48 kHz), z toho každá šestá je pilotní (BPSK) a zbylých 30 nese data (QPSK nebo 16-QAM).
// Signál je skutečný (bez nosné): spektrum se doplní komplexně sdruženě a vezme se reálná část.
//
// Rámec: trénovací posloupnost jako u PSK/QAM (korelace → začátek rámce) → 2 trénovací symboly OFDM
// (známé hodnoty; z nich se odhadne odezva kanálu na každé podnosné) → datové symboly → jeden záchytný symbol.
// Příjem: jednokoeficientový ekvalizér na podnosnou, zbytkový fázový posun a sklon (zpoždění) se v každém
// symbolu dolaďují z pilotních podnosných. Čísla podnosných nezávisí na vzorkovací frekvenci.
import { FrameAssembler, wrapPhy } from './frame'
import {
  Baseband,
  constellation,
  findSync,
  nearest,
  PN,
  TRAIN,
  type Constellation,
} from './linear'
import { AMPLITUDE, assemble, bytesToBits, GAP, ramp, SAMPLE_RATE, type Demodulated, type Modem } from './modem'

const NFFT = 512
const CP = 64
const FIRST = 16
const NCAR = 36
/** pilotní podnosné: indexy 0, 6, 12, … uvnitř pásma */
const isPilot = (i: number) => i % 6 === 0
const DATA_IDX = Array.from({ length: NCAR }, (_, i) => i).filter((i) => !isPilot(i))
const PILOT_IDX = Array.from({ length: NCAR }, (_, i) => i).filter(isPilot)
/** pilot a trénovací hodnoty: ±1 z PN posloupnosti */
const REF = Array.from({ length: NCAR }, (_, i) => PN[(i * 5) % TRAIN])
/** efektivní hodnota signálu OFDM (nižší než u ostatních režimů: špičky OFDM jsou 3–4× vyšší než efektivní hodnota) */
export const OFDM_RMS = 0.18
/** nosná a symbolová rychlost trénovací posloupnosti */
const SYNC_FC = 3000
const SYNC_BAUD = 1200

// --- FFT ---
const TW_RE = new Float64Array(NFFT / 2)
const TW_IM = new Float64Array(NFFT / 2)
for (let i = 0; i < NFFT / 2; i++) {
  TW_RE[i] = Math.cos((2 * Math.PI * i) / NFFT)
  TW_IM[i] = -Math.sin((2 * Math.PI * i) / NFFT)
}
/** FFT na místě (dopředná, bez normalizace); inverzní se dělá záměnou re/im. */
function fft(re: Float64Array, im: Float64Array) {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      ;[re[i], re[j]] = [re[j], re[i]]
      ;[im[i], im[j]] = [im[j], im[i]]
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1
    const stride = n / len
    for (let i = 0; i < n; i += len) {
      for (let j = 0; j < half; j++) {
        const wr = TW_RE[j * stride]
        const wi = TW_IM[j * stride]
        const a = i + j
        const b = a + half
        const tr = re[b] * wr - im[b] * wi
        const ti = re[b] * wi + im[b] * wr
        re[b] = re[a] - tr
        im[b] = im[a] - ti
        re[a] += tr
        im[a] += ti
      }
    }
  }
}

const SCALE = (OFDM_RMS * NFFT) / Math.sqrt(2 * NCAR)

/** Časový průběh jednoho symbolu OFDM včetně cyklického prefixu (hodnoty podnosných `X`, délka NCAR). */
function symbolWave(xr: number[], xi: number[]): Float32Array {
  // inverzní FFT přes dopřednou: IFFT(X) = conj(FFT(conj(X)))/N; vstup je Hermitovský, výsledek skutečný
  const re = new Float64Array(NFFT)
  const im = new Float64Array(NFFT)
  for (let i = 0; i < NCAR; i++) {
    const k = FIRST + i
    re[k] = xr[i]
    im[k] = -xi[i]
    re[NFFT - k] = xr[i]
    im[NFFT - k] = xi[i]
  }
  fft(re, im)
  const out = new Float32Array(NFFT + CP)
  for (let n = 0; n < NFFT; n++) out[CP + n] = (re[n] * SCALE) / NFFT
  for (let i = 0; i < CP; i++) out[i] = out[NFFT + i]
  return out
}

export interface OfdmProfile {
  kind: 'qpsk' | 'qam16'
}

function frameSamples(payload: Uint8Array, c: Constellation, fs: number, nroots: number): Float32Array {
  const bits = bytesToBits(wrapPhy(payload, nroots))
  const per = DATA_IDX.length * c.bps
  while (bits.length % per) bits.push(0)
  // trénovací posloupnost (BPSK na nosné) jako u jednonosných režimů
  const sps = fs / SYNC_BAUD
  const nTrain = Math.round(TRAIN * sps)
  const w = (2 * Math.PI * SYNC_FC) / fs
  const syms: Float32Array[] = []
  const train = new Float32Array(nTrain)
  for (let k = 0; k < TRAIN; k++)
    for (let n = Math.round(k * sps); n < Math.round((k + 1) * sps); n++) train[n] = AMPLITUDE * PN[k] * Math.cos(w * n)
  const zeros = new Array(NCAR).fill(0)
  const ref = REF.slice()
  syms.push(symbolWave(ref, zeros), symbolWave(ref, zeros))
  for (let off = 0; off < bits.length; off += per) {
    const xr = ref.slice()
    const xi = zeros.slice()
    DATA_IDX.forEach((idx, j) => {
      let l = 0
      for (let b = 0; b < c.bps; b++) l = (l << 1) | bits[off + j * c.bps + b]
      xr[idx] = c.pts[l][0]
      xi[idx] = c.pts[l][1]
    })
    syms.push(symbolWave(xr, xi))
  }
  syms.push(symbolWave(ref, zeros)) // záchytný symbol: doběh amplitudy nezasáhne data
  const out = new Float32Array(nTrain + syms.length * (NFFT + CP))
  out.set(train)
  syms.forEach((s, i) => out.set(s, nTrain + i * (NFFT + CP)))
  ramp(out, fs)
  return out
}

export function ofdmModem(p: OfdmProfile, nroots = 0): Modem {
  const c = constellation(p.kind)
  return {
    modulate: (frames, fs = SAMPLE_RATE) => assemble(frames.map((f) => frameSamples(f, c, fs, nroots)), fs),
    demodulate: (x, fs = SAMPLE_RATE) => demodulateOfdm(x, c, fs, nroots),
    airtime: (payloadBytes) => {
      const bits = (payloadBytes + 4 + nroots) * 8
      const syms = 3 + Math.ceil(bits / (DATA_IDX.length * c.bps))
      return TRAIN / SYNC_BAUD + (syms * (NFFT + CP)) / SAMPLE_RATE + GAP
    },
  }
}

function demodulateOfdm(x: Float32Array, c: Constellation, fs: number, nroots: number): Demodulated {
  const out: Demodulated = { frames: [], syncs: 0, corrected: 0 }
  const sps = fs / SYNC_BAUD
  const bb = new Baseband(x, SYNC_FC, fs)
  const SYM = NFFT + CP
  const re = new Float64Array(NFFT)
  const im = new Float64Array(NFFT)
  /** FFT okna od vzorku a: hodnoty podnosných (re, im) */
  const spectrum = (a: number, yr: number[], yi: number[]) => {
    for (let n = 0; n < NFFT; n++) {
      re[n] = x[a + n]
      im[n] = 0
    }
    fft(re, im)
    for (let i = 0; i < NCAR; i++) {
      yr[i] = re[FIRST + i]
      yi[i] = im[FIRST + i]
    }
  }
  // Vstup do FFT začíná uprostřed cyklického prefixu: snese chybu odhadu začátku ±CP/2.
  const D = CP / 2
  const minAfter = Math.ceil((4 * SYM) / sps)
  let at = 0
  while (at < x.length) {
    const lk = findSync(bb, sps, at, x.length, minAfter)
    if (!lk) break
    out.syncs++
    const base = lk.start + Math.round(TRAIN * sps)
    const yr = new Array<number>(NCAR)
    const yi = new Array<number>(NCAR)
    // odezva kanálu z obou trénovacích symbolů
    const hr = new Array<number>(NCAR).fill(0)
    const hi = new Array<number>(NCAR).fill(0)
    for (let t = 0; t < 2; t++) {
      spectrum(base + t * SYM + D, yr, yi)
      for (let i = 0; i < NCAR; i++) {
        hr[i] += (yr[i] * REF[i]) / 2
        hi[i] += (yi[i] * REF[i]) / 2
      }
    }
    const hm = hr.map((v, i) => v * v + hi[i] * hi[i] || 1e-12)
    const asm = new FrameAssembler(nroots)
    let s = 2
    const er = new Array<number>(NCAR)
    const ei = new Array<number>(NCAR)
    while (!asm.done && base + s * SYM + D + NFFT <= x.length) {
      spectrum(base + s * SYM + D, yr, yi)
      for (let i = 0; i < NCAR; i++) {
        er[i] = (yr[i] * hr[i] + yi[i] * hi[i]) / hm[i]
        ei[i] = (yi[i] * hr[i] - yr[i] * hi[i]) / hm[i]
      }
      // pilotní podnosné: lineární závislost fáze na čísle podnosné (a, b) metodou nejmenších čtverců
      let sk = 0
      let sp = 0
      let skk = 0
      let skp = 0
      for (const i of PILOT_IDX) {
        const ph = Math.atan2(ei[i] * REF[i], er[i] * REF[i])
        sk += i
        sp += ph
        skk += i * i
        skp += i * ph
      }
      const m = PILOT_IDX.length
      const b = (m * skp - sk * sp) / (m * skk - sk * sk)
      const a = (sp - b * sk) / m
      for (const i of DATA_IDX) {
        const ph = -(a + b * i)
        const cr = Math.cos(ph)
        const ci = Math.sin(ph)
        const zr = er[i] * cr - ei[i] * ci
        const zi = er[i] * ci + ei[i] * cr
        const l = nearest(c, zr, zi)
        for (let j = c.bps - 1; j >= 0; j--) asm.push((l >> j) & 1)
      }
      s++
    }
    if (asm.result) {
      out.frames.push(asm.result.payload)
      out.corrected += asm.result.corrected
    }
    at = asm.result ? base + s * SYM : lk.start + Math.round(TRAIN * sps)
  }
  return out
}
