import { describe, expect, it } from 'vitest'
import { levelVerdict } from './audio'
import { analyseModeTest, MODE_TEST_FRAMES, modeTestSignal, PROBE_TONES, probeSignal, toneAmplitude, toneBurst, toDb } from './probe'

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

describe('ukazatel hlasitosti', () => {
  it('rozliší slabý, dobrý a přebuzený vstup podle špičky', () => {
    expect(levelVerdict(0.005)).toBe('slabe')
    expect(levelVerdict(0.3)).toBe('dobre')
    expect(levelVerdict(0.99)).toBe('prebuzene')
  })
})

describe('zkouška režimů', () => {
  it('bez rušení projdou všechny režimy všemi rámci', () => {
    const fs = 48000
    const res = analyseModeTest(modeTestSignal(fs), fs)
    for (const r of res) expect(r.ok, r.mode).toBe(MODE_TEST_FRAMES)
  }, 60000)
})

describe('společná zkouška (tóny a režimy)', () => {
  const fs = 48000

  it('bez rušení se v záznamu najdou všechny tóny i všechny režimy', async () => {
    const { fullTestSignal, toneLevels, analyseModeTest, MODE_TEST_FRAMES, PROBE_TONES } = await import('./probe')
    const sig = fullTestSignal(fs)
    // záznam: 3 s ticha před vysíláním (odpočet) a ticho po něm
    const rec = new Float32Array(fs * 3 + sig.length + fs * 4)
    rec.set(sig, fs * 3)
    const levels = toneLevels(rec, fs)
    for (const l of levels) expect(l).toBeGreaterThan(-9) // tón s amplitudou 0,5 má asi −6 dB
    expect(levels).toHaveLength(PROBE_TONES.length)
    for (const r of analyseModeTest(rec, fs)) expect(r.ok).toBe(MODE_TEST_FRAMES)
  })

  it('slabý první tón nezpůsobí, že se ztratí tóny na konci', async () => {
    const { fullTestSignal, toneLevels, PROBE_TONE_S, PROBE_GAP_S } = await import('./probe')
    const sig = fullTestSignal(fs)
    const rec = new Float32Array(fs * 2 + sig.length)
    rec.set(sig, fs * 2)
    // první tón (500 Hz) úplně utlumit, zbytek beze změny
    const first = Math.round((PROBE_TONE_S + PROBE_GAP_S) * fs)
    for (let i = 0; i < first; i++) rec[fs * 2 + i] = 0
    const levels = toneLevels(rec, fs)
    expect(levels[0]).toBeLessThan(-60)
    expect(levels[7]).toBeGreaterThan(-9)
  })

  it('v tichu nenaměří nic', async () => {
    const { toneLevels } = await import('./probe')
    for (const l of toneLevels(new Float32Array(fs * 20), fs)) expect(l).toBe(-120)
  })

  it('celá zkouška trvá do zhruba minuty', async () => {
    const { fullTestSeconds } = await import('./probe')
    expect(fullTestSeconds()).toBeLessThan(75)
    expect(fullTestSeconds()).toBeGreaterThan(20)
  })
})
