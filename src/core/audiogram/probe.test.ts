import { describe, expect, it } from 'vitest'
import { PROBE_TONES, probeSignal, toneAmplitude, toneBurst, toDb } from './probe'

describe('zkouška zvuku', () => {
  it('změří amplitudu čistého tónu a rozliší ostatní frekvence', () => {
    const fs = 48000
    const x = toneBurst(2000, fs, 0.3, 0.4)
    expect(toneAmplitude(x, 2000, fs)).toBeGreaterThan(0.33)
    expect(toneAmplitude(x, 2000, fs)).toBeLessThan(0.45)
    expect(toneAmplitude(x, 4000, fs)).toBeLessThan(0.01)
    expect(toDb(0.5)).toBeCloseTo(-6.02, 1)
    expect(toDb(0)).toBe(-120)
  })
  it('celý signál obsahuje všechny tóny ve svých úsecích', () => {
    const fs = 48000
    const sig = probeSignal(fs)
    const slot = Math.round((0.7 + 0.2) * fs)
    PROBE_TONES.forEach((f, i) => {
      const part = sig.subarray(i * slot + 0.1 * fs, i * slot + 0.6 * fs)
      expect(toneAmplitude(part, f, fs)).toBeGreaterThan(0.4)
    })
  })
})
