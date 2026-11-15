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
