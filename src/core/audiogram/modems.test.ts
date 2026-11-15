import { describe, expect, it } from 'vitest'
import { afskModem } from './afsk'
import { makeChannel, rng } from './channel'
import type { Modem } from './modem'
import { chooseMode, esn0, FEC, MODES } from './modes'

const bytesOf = (n: number, seed = 7) => {
  const r = rng(seed)
  return Uint8Array.from({ length: n }, () => Math.floor(r() * 256))
}
/** šum (sigma na vzorek) odpovídající odstupu `snr` dB v měřítku `esn0` */
const sigmaFor = (snr: number) => Math.sqrt((0.7 * 0.7 * (48000 / 300)) / (4 * 10 ** (snr / 10)))

/** Podíl rámců (48 B), které dojdou správně, při daném šumu. */
function rate(m: Modem, sigma: number, trials = 8): number {
  let ok = 0
  for (let s = 0; s < trials; s++) {
    const f = bytesOf(48, 100 + s)
    const x = makeChannel({ sigma, seed: 50 + s, delay: s * 777 })(m.modulate([f]))
    const d = m.demodulate(x)
    if (d.frames.length === 1 && d.frames[0].every((v, i) => v === f[i])) ok++
  }
  return ok / trials
}

describe('modemy: round-trip', () => {
  for (const m of MODES) {
    it(`${m.name}: víc rámců, zpoždění a tichý signál`, () => {
      const frames = [bytesOf(48, 1), bytesOf(10, 2), bytesOf(0, 3), bytesOf(52, 4)]
      const x = makeChannel({ delay: 12345, gain: 0.2 })(m.modem.modulate(frames))
      expect(m.modem.demodulate(x).frames).toEqual(frames)
    })
    it(`${m.name}: odhad doby vysílání odpovídá zvuku`, () => {
      const x = m.modem.modulate([bytesOf(52)])
      const real = x.length / 48000
      const est = m.modem.airtime(52)
      // zvuk obsahuje navíc ticho před a za rámcem (2 × 0,12 s)
      expect(Math.abs(real - 0.24 - est)).toBeLessThan(0.1 * est + 0.03)
    })
  }

  it('prázdná nahrávka a čistý šum nedají žádný rámec', () => {
    for (const m of MODES) {
      expect(m.modem.demodulate(new Float32Array(48000)).frames).toEqual([])
      const noise = makeChannel({ sigma: 0.5, seed: 9 })(new Float32Array(96000))
      expect(m.modem.demodulate(noise).frames, m.name).toEqual([])
    }
  })

  it('rozdíl taktu zařízení (hodiny o 100 ppm) a frekvence nosné se dorovná', () => {
    // simulace: nahrávka je o 100 ppm „rychlejší“ (lineární převzorkování)
    const resample = (x: Float32Array, f: number) => {
      const out = new Float32Array(Math.floor(x.length / f))
      for (let i = 0; i < out.length; i++) {
        const p = i * f
        const a = Math.floor(p)
        out[i] = x[a] * (1 - (p - a)) + (x[a + 1] ?? 0) * (p - a)
      }
      return out
    }
    for (const id of [0, 3, 4, 6, 8]) {
      const m = MODES[id]
      const frames = [bytesOf(48, 9), bytesOf(48, 10)]
      const x = resample(m.modem.modulate(frames), 1.0001)
      expect(m.modem.demodulate(x).frames, m.name).toEqual(frames)
    }
  })
})

describe('modemy: chybovost podle šumu (měření)', () => {
  it('každý režim obstojí s rezervou nad svým prahem a nad ním ne (práh v minSnrDb je změřený)', () => {
    const lines: string[] = []
    for (const m of MODES.slice(1)) {
      const hi = rate(m.modem, sigmaFor(m.minSnrDb + 2))
      const lo = rate(m.modem, sigmaFor(m.minSnrDb - 7))
      lines.push(`${m.name.padEnd(12)} práh ${m.minSnrDb} dB: +2 dB ${hi * 100}%, −7 dB ${lo * 100}%`)
      expect(hi, m.name).toBeGreaterThanOrEqual(0.85)
      expect(lo, m.name).toBeLessThanOrEqual(0.4)
    }
    console.log(lines.join('\n'))
  })

  it('Reed–Solomon: AFSK 300 s opravou chyb vydrží víc šumu než jen s CRC (tabulka před/po)', () => {
    const plain = afskModem({ baud: 300, f0: 1200, f1: 2100 }, 0)
    const fec = afskModem({ baud: 300, f0: 1200, f1: 2100 }, FEC)
    const rows: string[] = ['odstup [dB] | jen CRC | CRC + RS(' + FEC + ')']
    let better = 0
    for (const snr of [14, 13, 12, 11, 10, 9]) {
      const sg = sigmaFor(snr)
      const a = rate(plain, sg, 16)
      const b = rate(fec, sg, 16)
      rows.push(`${String(snr).padStart(11)} | ${String(a * 100).padStart(5)} % | ${b * 100} %`)
      if (b > a) better++
      // oprava chyb nikdy nezhorší stejný rámec výrazně (nad rámec statistického kolísání)
      expect(b).toBeGreaterThanOrEqual(a - 0.2)
    }
    console.log(rows.join('\n'))
    expect(better).toBeGreaterThanOrEqual(2)
    expect(rate(fec, sigmaFor(14), 16)).toBeGreaterThanOrEqual(0.95)
  })
})

describe('volba režimu', () => {
  it('podle odstupu stoupá rychlost; mez režimu a rezerva se dodrží', () => {
    let prev = 0
    for (const snr of [0, 12, 16, 20, 25, 32, 45]) {
      const m = chooseMode(snr)
      expect(m.bitrate).toBeGreaterThanOrEqual(prev)
      prev = m.bitrate
    }
    expect(chooseMode(5).id).toBe(0)
    expect(chooseMode(60).name).toBe('OFDM 16-QAM')
    expect(chooseMode(60, 4).id).toBe(4)
    // s rezervou 2 dB: 30 dB nestačí na OFDM QPSK (30,5), stačí na 16-QAM / 8-PSK
    expect(chooseMode(30).kind).not.toBe('ofdm')
  })

  it('odhad odstupu z handshake se shoduje s modelem šumu (±3 dB)', () => {
    const m = MODES[0].modem
    for (const snr of [20, 15, 11]) {
      const x = makeChannel({ sigma: sigmaFor(snr), seed: 3 })(m.modulate([bytesOf(8)]))
      const d = m.demodulate(x)
      expect(d.snr).toBeDefined()
      expect(Math.abs(10 * Math.log10(d.snr!) - snr)).toBeLessThan(3)
    }
    expect(esn0(sigmaFor(15))).toBeCloseTo(15, 5)
  })
})
