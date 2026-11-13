// AFSK (frekvenční klíčování zvukovými tóny, jako packet radio): bit 0 = nižší tón, bit 1 = vyšší tón,
// fáze je spojitá. Demodulátor je nekoherentní (energie obou tónů v okně jednoho symbolu), takže nepotřebuje
// znát fázi ani přesnou frekvenci. Rozestup tónů je celý násobek symbolové rychlosti, takže jsou v okně ortogonální.
import { FrameAssembler, wrapPhy } from './frame'
import {
  AMPLITUDE,
  assemble,
  bytesToBits,
  GAP,
  ramp,
  SAMPLE_RATE,
  type Demodulated,
  type Modem,
} from './modem'

export { SAMPLE_RATE }
export type { Demodulated }

export interface AfskProfile {
  /** symbolů za sekundu */
  baud: number
  /** tón pro bit 0 a bit 1 (Hz) */
  f0: number
  f1: number
}

/** předzvuk: střídavé bity, na nichž se demodulátor „zachytí“ */
const PREAMBLE_BITS = 32
/** synchronizační slovo (CCSDS ASM, výborná autokorelace) */
const SYNC = 0x1acffc1d
const SYNC_BITS = 32

function headerBits(): number[] {
  const out: number[] = []
  for (let i = 0; i < PREAMBLE_BITS; i++) out.push(i & 1)
  for (let i = SYNC_BITS - 1; i >= 0; i--) out.push((SYNC >>> i) & 1)
  return out
}
const HEADER = headerBits()

/** Zvuk jednoho rámce (bez ticha). */
function frameSamples(payload: Uint8Array, p: AfskProfile, fs: number, nroots: number): Float32Array {
  // za daty pár záchytných bitů: náběh a doběh (útlum) pak nezasáhnou datové symboly
  const bits = [...HEADER, ...bytesToBits(wrapPhy(payload, nroots)), 1, 0, 1, 0, 1]
  const sps = fs / p.baud
  const out = new Float32Array(Math.ceil(bits.length * sps) + 1)
  let phase = 0
  let n = 0
  for (let k = 0; k < bits.length; k++) {
    const end = Math.round((k + 1) * sps)
    const w = (2 * Math.PI * (bits[k] ? p.f1 : p.f0)) / fs
    for (; n < end; n++) {
      phase += w
      out[n] = AMPLITUDE * Math.sin(phase)
    }
  }
  const r = out.subarray(0, n)
  ramp(r, fs)
  return r
}

/** Prefixové součty směšovaných signálů pro výpočet energie tónu v libovolném okně v konstantním čase. */
class Tone {
  ci: Float64Array
  cq: Float64Array
  constructor(x: Float32Array, f: number, fs: number) {
    this.ci = new Float64Array(x.length + 1)
    this.cq = new Float64Array(x.length + 1)
    const w = (2 * Math.PI * f) / fs
    // oscilátor se otáčí po krocích (rychlejší než sin/cos pro každý vzorek), po 4096 vzorcích se přepočte
    let c = 1
    let s = 0
    const dc = Math.cos(w)
    const ds = Math.sin(w)
    let ai = 0
    let aq = 0
    for (let n = 0; n < x.length; n++) {
      if ((n & 4095) === 0) {
        c = Math.cos(w * n)
        s = Math.sin(w * n)
      }
      ai += x[n] * c
      aq += x[n] * s
      this.ci[n + 1] = ai
      this.cq[n + 1] = aq
      const nc = c * dc - s * ds
      s = s * dc + c * ds
      c = nc
    }
  }
  /** energie v okně [a, a+len) */
  e(a: number, len: number): number {
    const i = this.ci[a + len] - this.ci[a]
    const q = this.cq[a + len] - this.cq[a]
    return i * i + q * q
  }
}

/** Modem AFSK s daným profilem a počtem kontrolních bajtů Reed–Solomon (0 = jen CRC). */
export function afskModem(p: AfskProfile, nroots = 0): Modem {
  return {
    modulate: (frames, fs = SAMPLE_RATE) => assemble(frames.map((f) => frameSamples(f, p, fs, nroots)), fs),
    demodulate: (x, fs = SAMPLE_RATE) => demodulateAfsk(x, p, fs, nroots),
    airtime: (payloadBytes) => (HEADER.length + (payloadBytes + 4 + nroots) * 8 + 5) / p.baud + GAP,
  }
}

function demodulateAfsk(x: Float32Array, p: AfskProfile, fs: number, nroots: number): Demodulated {
  const out: Demodulated = { frames: [], syncs: 0, corrected: 0 }
  const sps = fs / p.baud
  const N = Math.max(4, Math.round(sps))
  const t0 = new Tone(x, p.f0, fs)
  const t1 = new Tone(x, p.f1, fs)
  const pos = (start: number, k: number) => start + Math.round(k * sps)
  /** rozdíl energií tónů v okně symbolu k (kladný = bit 1) */
  const diff = (start: number, k: number) => {
    const a = pos(start, k)
    return t1.e(a, N) - t0.e(a, N)
  }
  const sum = (start: number, k: number) => {
    const a = pos(start, k)
    return t1.e(a, N) + t0.e(a, N)
  }
  // hlavička: skóre shody se vzorem; normalizace největší energií okna (částečně překrytý úsek, zbytek ticho,
  // tak nemůže dosáhnout plného skóre)
  const score = (start: number) => {
    let s = 0
    let emax = 0
    for (let k = 0; k < HEADER.length; k++) {
      s += (HEADER[k] ? 1 : -1) * diff(start, k)
      emax = Math.max(emax, sum(start, k))
    }
    return emax > 1e-9 ? s / (emax * HEADER.length) : 0
  }
  const step = Math.max(1, Math.floor(N / 6))
  // předzvuk sám dá až ~0,5, proto je práh nízký a pravý začátek se hledá jako maximum v okolí; šum dává ~0,04 ± 0,04
  const THRESHOLD = 0.3
  const maxStart = x.length - pos(0, HEADER.length + 24) - N
  let at = 0
  while (at < maxStart) {
    let found = -1
    for (let n = at; n < maxStart; n += step) {
      if (score(n) >= THRESHOLD) {
        found = n
        break
      }
    }
    if (found < 0) break
    // zpřesnění: střed „plošiny“ kolem maxima (skóre je u vrcholu ploché)
    const cand: number[] = []
    const scores: number[] = []
    for (let n = Math.max(at, found - 2 * step); n <= Math.min(maxStart, found + (PREAMBLE_BITS + 8) * N); n++) {
      cand.push(n)
      scores.push(score(n))
    }
    const top = Math.max(...scores)
    let lo = scores.indexOf(top)
    let hi = lo
    while (lo > 0 && scores[lo - 1] >= top - 0.03) lo--
    while (hi < scores.length - 1 && scores[hi + 1] >= top - 0.03) hi++
    const best = cand[(lo + hi) >> 1]
    out.syncs++
    const asm = new FrameAssembler(nroots)
    let k = HEADER.length
    while (!asm.done && pos(best, k) + N <= x.length) asm.push(diff(best, k++) > 0 ? 1 : 0)
    if (asm.result) {
      out.frames.push(asm.result.payload)
      out.corrected += asm.result.corrected
      // odhad odstupu ze známých symbolů hlavičky: energie očekávaného tónu vs. druhého tónu
      let es = 0
      let en = 0
      for (let j = 0; j < HEADER.length; j++) {
        const a = pos(best, j)
        const e1 = t1.e(a, N)
        const e0 = t0.e(a, N)
        es += HEADER[j] ? e1 : e0
        en += HEADER[j] ? e0 : e1
      }
      const snr = en > 1e-12 ? Math.max(0, es - en) / en : 1e6
      out.snr = out.snr === undefined ? snr : Math.max(out.snr, snr)
    }
    // pokračuj za rámcem (při chybě jen kousek za synchronizací, ať se nezahodí následující rámec)
    at = asm.result ? pos(best, k) : pos(best, HEADER.length)
  }
  return out
}
