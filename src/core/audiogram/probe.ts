import { decodeMsg, encodeMsg, Type } from './frame'
import { MODES } from './modes'

// Zkouška zvukové cesty mezi dvěma zařízeními: jedno přehraje řadu čistých tónů, druhé u každého změří úroveň
// (Goertzelův filtr). Ukáže, která pásma reproduktor a mikrofon (a zpracování zvuku v telefonu) propustí.

/** Zkušební tóny v Hz: od spodku hovorového pásma přes pásmo, které využívají režimy, po vyšší tóny. */
export const PROBE_TONES = [500, 1000, 1500, 2000, 3000, 4000, 6000, 8000]

/** Délka jednoho tónu a mezery mezi tóny (s). */
export const PROBE_TONE_S = 0.7
export const PROBE_GAP_S = 0.2

/** Zvuk jednoho tónu s krátkým náběhem a doběhem (bez lupnutí). */
export function toneBurst(freq: number, fs: number, seconds = PROBE_TONE_S, amplitude = 0.5): Float32Array {
  const n = Math.round(seconds * fs)
  const ramp = Math.round(0.02 * fs)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const edge = Math.min(1, i / ramp, (n - 1 - i) / ramp)
    out[i] = amplitude * edge * Math.sin((2 * Math.PI * freq * i) / fs)
  }
  return out
}

/** Celá zkouška: všechny tóny za sebou s mezerami. */
export function probeSignal(fs: number, tones = PROBE_TONES): Float32Array {
  const tone = Math.round(PROBE_TONE_S * fs)
  const gap = Math.round(PROBE_GAP_S * fs)
  const out = new Float32Array(tones.length * (tone + gap))
  tones.forEach((f, i) => out.set(toneBurst(f, fs), i * (tone + gap)))
  return out
}

/** Amplituda sinusovky o frekvenci `freq` obsažená v úseku `x` (Goertzel, s Hannovým oknem). Vrací 0 až 1 (1 = plná). */
export function toneAmplitude(x: ArrayLike<number>, freq: number, fs: number): number {
  const n = x.length
  if (!n) return 0
  const w = (2 * Math.PI * freq) / fs
  let re = 0
  let im = 0
  let win = 0
  for (let i = 0; i < n; i++) {
    const h = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1 || 1))
    re += x[i] * h * Math.cos(w * i)
    im -= x[i] * h * Math.sin(w * i)
    win += h
  }
  return (2 * Math.hypot(re, im)) / win
}

/** Úroveň v dB vůči plné amplitudě (−120 při tichu). */
export const toDb = (a: number) => (a > 1e-6 ? 20 * Math.log10(a) : -120)

/** Celková efektivní hodnota úseku. */
export function rms(x: ArrayLike<number>): number {
  let e = 0
  for (let i = 0; i < x.length; i++) e += x[i] * x[i]
  return Math.sqrt(e / (x.length || 1))
}

// ---- Zkouška režimů: odesílatel pošle několik rámců v každém režimu, příjemce zjistí, které režimy prošly. ----
/** Počet zkušebních rámců v každém režimu a označení zkoušky (číslo relace). */
export const MODE_TEST_FRAMES = 3
const MODE_TEST_SESSION = 0xee
/** Pauza mezi režimy (s). */
const MODE_TEST_GAP_S = 0.8

const testFrames = () =>
  Array.from({ length: MODE_TEST_FRAMES }, (_, seq) =>
    encodeMsg({
      type: Type.Data,
      session: MODE_TEST_SESSION,
      seq,
      data: Uint8Array.from({ length: 48 }, (_, i) => (i * 37 + seq * 11 + 5) & 255),
    }),
  )

/** Zvuk celé zkoušky: všechny režimy za sebou. */
export function modeTestSignal(fs: number): Float32Array {
  const gap = Math.round(MODE_TEST_GAP_S * fs)
  const parts = MODES.map((m) => m.modem.modulate(testFrames(), fs))
  const out = new Float32Array(parts.reduce((s, p) => s + p.length + gap, 0))
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.length + gap
  }
  return out
}

/** Doba zvuku celé zkoušky (s). */
export const modeTestSeconds = () =>
  MODES.reduce((s, m) => s + m.modem.airtime(48 + 4) * MODE_TEST_FRAMES + MODE_TEST_GAP_S + 0.3, 0)

export interface ModeTestResult {
  mode: string
  bitrate: number
  /** kolik zkušebních rámců prošlo (z MODE_TEST_FRAMES) */
  ok: number
}

/** Ve zvukovém záznamu spočítá, kolik zkušebních rámců prošlo v každém režimu. */
export function analyseModeTest(rec: Float32Array, fs: number): ModeTestResult[] {
  return MODES.map((m) => {
    const seen = new Set<number>()
    try {
      for (const f of m.modem.demodulate(rec, fs).frames) {
        const msg = decodeMsg(f)
        if (msg?.type === Type.Data && msg.session === MODE_TEST_SESSION && msg.seq < MODE_TEST_FRAMES) seen.add(msg.seq)
      }
    } catch {
      /* režim nic nenašel */
    }
    return { mode: m.name, bitrate: m.bitrate, ok: seen.size }
  })
}
