// Jednonosné lineární modulace (BPSK, QPSK, 8-PSK, 16-QAM) na nosné v zvukovém pásmu a společná synchronizace
// pro koherentní příjem (použije ji i OFDM). Rámec: úvodní trénovací posloupnost (63 symbolů BPSK, PN) →
// data → pár záchytných symbolů. Přijímač ze trénovací posloupnosti najde začátek rámce (korelace), odhadne
// komplexní zesílení kanálu (fáze i amplituda) a rozdíl frekvencí zařízení; během dat dolaďuje fázi smyčkou
// řízenou rozhodnutím. Symboly se vzorkují integrací přes celý symbol (přizpůsobený filtr pro obdélníkový impulz).
import { FrameAssembler, wrapPhy } from './frame'
import { AMPLITUDE, assemble, bytesToBits, GAP, ramp, SAMPLE_RATE, type Demodulated, type Modem } from './modem'

/** Délka trénovací posloupnosti (symbolů). */
export const TRAIN = 63
/** posloupnost maximální délky z posuvného registru (x^6 + x^5 + 1), hodnoty ±1 */
export const PN: number[] = (() => {
  let r = 0b000001
  const out: number[] = []
  for (let i = 0; i < TRAIN; i++) {
    out.push(r & 1 ? 1 : -1)
    const fb = ((r >> 5) ^ (r >> 4)) & 1
    r = ((r << 1) | fb) & 0x3f
  }
  return out
})()

/** Signál posunutý do základního pásma (násobení e^{-jωn}) s prefixovými součty: součet v libovolném okně v O(1). */
export class Baseband {
  pr: Float64Array
  pi: Float64Array
  constructor(x: Float32Array, fc: number, fs: number) {
    this.pr = new Float64Array(x.length + 1)
    this.pi = new Float64Array(x.length + 1)
    const w = (2 * Math.PI * fc) / fs
    let c = 1
    let s = 0
    const dc = Math.cos(w)
    const ds = Math.sin(w)
    let ar = 0
    let ai = 0
    for (let n = 0; n < x.length; n++) {
      if ((n & 4095) === 0) {
        c = Math.cos(w * n)
        s = Math.sin(w * n)
      }
      ar += x[n] * c
      ai -= x[n] * s
      this.pr[n + 1] = ar
      this.pi[n + 1] = ai
      const nc = c * dc - s * ds
      s = s * dc + c * ds
      c = nc
    }
  }
}

export interface Lock {
  /** začátek trénovací posloupnosti (vzorek) */
  start: number
  /** komplexní zesílení kanálu na jeden symbol (součet přes okno symbolu = h · symbol) */
  hr: number
  hi: number
  /** fázový posun za symbol (rad), z rozdílu frekvencí zařízení */
  omega: number
  /** kvalita synchronizace 0…1 */
  score: number
}

/** Najde další rámec od vzorku `from`: začátek, zesílení a frekvenční odchylku; undefined, když už žádný není. */
export function findSync(
  bb: Baseband,
  sps: number,
  from: number,
  length: number,
  after: number,
): Lock | undefined {
  const N = Math.max(4, Math.round(sps))
  const pos = (start: number, k: number) => start + Math.round(k * sps)
  const win = (start: number, k: number, out: number[]) => {
    const a = pos(start, k)
    out[0] = bb.pr[a + N] - bb.pr[a]
    out[1] = bb.pi[a + N] - bb.pi[a]
  }
  const t: number[] = [0, 0]
  const score = (start: number) => {
    let cr = 0
    let ci = 0
    let smax = 0
    for (let k = 0; k < TRAIN; k++) {
      win(start, k, t)
      cr += PN[k] * t[0]
      ci += PN[k] * t[1]
      smax = Math.max(smax, Math.hypot(t[0], t[1]))
    }
    return smax > 1e-9 ? Math.hypot(cr, ci) / (TRAIN * smax) : 0
  }
  const step = Math.max(1, Math.floor(N / 6))
  const THRESHOLD = 0.35
  // hotový rámec musí mít aspoň trénovací posloupnost a nějaká data
  const maxStart = length - pos(0, TRAIN + after) - N
  for (let n = from; n < maxStart; n += step) {
    if (score(n) < THRESHOLD) continue
    let best = n
    let bs = 0
    for (let m = Math.max(from, n - step); m <= Math.min(maxStart, n + 2 * N); m++) {
      const s = score(m)
      if (s > bs) {
        bs = s
        best = m
      }
    }
    // zesílení a frekvence z trénovací posloupnosti
    let c1r = 0
    let c1i = 0
    let c2r = 0
    let c2i = 0
    const half = 31
    for (let k = 0; k < TRAIN; k++) {
      win(best, k, t)
      if (k < half) {
        c1r += PN[k] * t[0]
        c1i += PN[k] * t[1]
      } else {
        c2r += PN[k] * t[0]
        c2i += PN[k] * t[1]
      }
    }
    const hr = (c1r + c2r) / TRAIN
    const hi = (c1i + c2i) / TRAIN
    // fáze druhé poloviny vůči první; středy polovin jsou od sebe 31,5 symbolu
    const omega = Math.atan2(c2i * c1r - c2r * c1i, c2r * c1r + c2i * c1i) / 31.5
    return { start: best, hr, hi, omega, score: bs }
  }
  return undefined
}

// --- konstelace (průměrný výkon 1, Grayovo kódování) ---

export interface Constellation {
  bps: number
  /** bod pro každé označení (hodnotu bitů) */
  pts: [number, number][]
}

const gray = (i: number) => i ^ (i >> 1)

export function constellation(kind: 'bpsk' | 'qpsk' | 'psk8' | 'qam16'): Constellation {
  switch (kind) {
    case 'bpsk':
      return { bps: 1, pts: [[-1, 0], [1, 0]] }
    case 'qpsk': {
      const a = Math.SQRT1_2
      return { bps: 2, pts: [0, 1, 2, 3].map((l) => [(l >> 1 ? 1 : -1) * a, (l & 1 ? 1 : -1) * a] as [number, number]) }
    }
    case 'psk8': {
      const pts: [number, number][] = new Array(8)
      for (let i = 0; i < 8; i++) pts[gray(i)] = [Math.cos((2 * Math.PI * i) / 8), Math.sin((2 * Math.PI * i) / 8)]
      return { bps: 3, pts }
    }
    case 'qam16': {
      const lev = [-3, -1, 3, 1] // Gray: 00, 01, 11, 10 → -3, -1, 1, 3
      const s = 1 / Math.sqrt(10)
      const pts: [number, number][] = []
      for (let l = 0; l < 16; l++) pts.push([lev[l >> 2] * s, lev[l & 3] * s])
      return { bps: 4, pts }
    }
  }
}

/** Nejbližší bod konstelace: označení a bod. */
export function nearest(c: Constellation, zr: number, zi: number): number {
  let best = 0
  let bd = Infinity
  for (let l = 0; l < c.pts.length; l++) {
    const d = (zr - c.pts[l][0]) ** 2 + (zi - c.pts[l][1]) ** 2
    if (d < bd) {
      bd = d
      best = l
    }
  }
  return best
}

export interface LinearProfile {
  kind: 'bpsk' | 'qpsk' | 'psk8' | 'qam16'
  baud: number
  /** nosná (Hz); násobek baud/2, aby se dvojnásobná frekvence v okně symbolu přesně vystřídala */
  fc: number
}

/** Záchytné symboly za daty (náběh a doběh amplitudy je nezasáhne). */
const TAIL = 4

function frameSamples(payload: Uint8Array, p: LinearProfile, fs: number, nroots: number): Float32Array {
  const c = constellation(p.kind)
  const bits = bytesToBits(wrapPhy(payload, nroots))
  while (bits.length % c.bps) bits.push(0)
  const syms: [number, number][] = PN.map((v) => [v, 0] as [number, number])
  for (let i = 0; i < bits.length; i += c.bps) {
    let l = 0
    for (let j = 0; j < c.bps; j++) l = (l << 1) | bits[i + j]
    syms.push(c.pts[l])
  }
  for (let i = 0; i < TAIL; i++) syms.push([i & 1 ? 1 : -1, 0])
  const sps = fs / p.baud
  const out = new Float32Array(Math.round(syms.length * sps) + 1)
  const w = (2 * Math.PI * p.fc) / fs
  let n = 0
  for (let k = 0; k < syms.length; k++) {
    const end = Math.round((k + 1) * sps)
    const [si, sq] = syms[k]
    for (; n < end; n++) out[n] = AMPLITUDE * (si * Math.cos(w * n) - sq * Math.sin(w * n))
  }
  const r = out.subarray(0, n)
  ramp(r, fs)
  return r
}

export function linearModem(p: LinearProfile, nroots = 0): Modem {
  const c = constellation(p.kind)
  return {
    modulate: (frames, fs = SAMPLE_RATE) => assemble(frames.map((f) => frameSamples(f, p, fs, nroots)), fs),
    demodulate: (x, fs = SAMPLE_RATE) => demodulateLinear(x, p, c, fs, nroots),
    airtime: (payloadBytes) => {
      const bits = (payloadBytes + 4 + nroots) * 8
      return (TRAIN + Math.ceil(bits / c.bps) + TAIL) / p.baud + GAP
    },
  }
}

function demodulateLinear(x: Float32Array, p: LinearProfile, c: Constellation, fs: number, nroots: number): Demodulated {
  const out: Demodulated = { frames: [], syncs: 0, corrected: 0 }
  const sps = fs / p.baud
  const N = Math.max(4, Math.round(sps))
  const bb = new Baseband(x, p.fc, fs)
  const pos = (start: number, k: number) => start + Math.round(k * sps)
  let at = 0
  while (at < x.length) {
    const lk = findSync(bb, sps, at, x.length, 24)
    if (!lk) break
    out.syncs++
    const hm = lk.hr * lk.hr + lk.hi * lk.hi
    const asm = new FrameAssembler(nroots)
    let theta = 0
    let k = TRAIN
    while (!asm.done && pos(lk.start, k) + N <= x.length) {
      const a = pos(lk.start, k)
      const sr = bb.pr[a + N] - bb.pr[a]
      const si = bb.pi[a + N] - bb.pi[a]
      // zesílení kanálu (dělení h) a otočení o odhadnutý fázový posun za symbol (od středu trénovací posloupnosti)
      let zr = (sr * lk.hr + si * lk.hi) / hm
      let zi = (si * lk.hr - sr * lk.hi) / hm
      const ph = -lk.omega * (k - 31) - theta
      const cr = Math.cos(ph)
      const ci = Math.sin(ph)
      const rr = zr * cr - zi * ci
      const ri = zr * ci + zi * cr
      zr = rr
      zi = ri
      const l = nearest(c, zr, zi)
      // fázová chyba vůči rozhodnutí: dolaďuje smyčku (jen pro konstelace s dostatečnou vzdáleností bodů)
      const [dr, di] = c.pts[l]
      theta += 0.05 * Math.atan2(zi * dr - zr * di, zr * dr + zi * di)
      for (let j = c.bps - 1; j >= 0; j--) asm.push((l >> j) & 1)
      k++
    }
    if (asm.result) {
      out.frames.push(asm.result.payload)
      out.corrected += asm.result.corrected
    }
    at = asm.result ? pos(lk.start, k) : pos(lk.start, TRAIN)
  }
  return out
}
