import { describe, expect, it } from 'vitest'
import { demodulate, modulate } from './afsk'
import { makeChannel, rng } from './channel'
import { crc16, crc32 } from './crc'
import { decodeMsg, encodeMsg, Type, unwrapPhy, wrapPhy } from './frame'
import { MODES, chooseMode } from './modes'

const bytesOf = (n: number, seed = 7) => {
  const r = rng(seed)
  return Uint8Array.from({ length: n }, () => Math.floor(r() * 256))
}

describe('CRC a rámce', () => {
  it('známé hodnoty', () => {
    const t = new TextEncoder().encode('123456789')
    expect(crc16(t)).toBe(0x29b1)
    expect(crc32(t)).toBe(0xcbf43926)
  })
  it('wrap/unwrap a detekce poškození', () => {
    const w = wrapPhy(bytesOf(20))
    expect(unwrapPhy(w)).toEqual(bytesOf(20))
    w[5] ^= 0x10
    expect(unwrapPhy(w)).toBeUndefined()
  })
  it('zprávy protokolu se překlopí tam a zpět', () => {
    const msgs = [
      { type: Type.Call, session: 3, size: 123456, frames: 2572, crc: 0xdeadbeef, maxMode: 2 },
      { type: Type.Ready, session: 3, snr: -5, mode: 1 },
      { type: Type.Data, session: 3, seq: 300, data: bytesOf(48) },
      { type: Type.Ack, session: 3, map: Uint8Array.from([255, 1]) },
    ] as const
    for (const m of msgs) expect(decodeMsg(encodeMsg(m))).toEqual(m)
  })
})

describe('AFSK', () => {
  for (const m of MODES) {
    it(`${m.name}: round-trip bez šumu, se zpožděním a tišším signálem`, () => {
      const frames = [bytesOf(48, 1), bytesOf(10, 2), bytesOf(0, 3), bytesOf(48, 4)]
      const x = makeChannel({ delay: 12345, gain: 0.2 })(modulate(frames, m.afsk))
      const d = demodulate(x, m.afsk)
      expect(d.frames).toEqual(frames)
    })
  }

  it('prázdná nahrávka a čistý šum nedají žádný rámec', () => {
    const p = MODES[0].afsk
    expect(demodulate(new Float32Array(48000), p).frames).toEqual([])
    const noise = makeChannel({ sigma: 0.5, seed: 9 })(new Float32Array(96000))
    expect(demodulate(noise, p).frames).toEqual([])
  })

  it('chybovost podle šumu: rychlé režimy dřív selžou než robustní (měření)', () => {
    // podíl doručených rámců podle šumu; tvrdé meze s rezervou, tabulka se vypíše pro ladění
    const rows: string[] = []
    const rate = (mi: number, sigma: number) => {
      const p = MODES[mi].afsk
      let ok = 0
      const total = 12
      for (let s = 0; s < total; s++) {
        const frames = [bytesOf(48, 100 + s)]
        const x = makeChannel({ sigma, seed: 50 + s, delay: s * 777 })(modulate(frames, p))
        const d = demodulate(x, p)
        if (d.frames.length === 1 && d.frames[0].every((v, i) => v === frames[0][i])) ok++
      }
      return ok / total
    }
    const table: Record<number, Record<number, number>> = {}
    for (const sigma of [0.2, 0.5, 1, 1.5, 2]) {
      for (const mi of [0, 1, 2]) {
        ;(table[sigma] ??= {})[mi] = rate(mi, sigma)
      }
      rows.push(`sigma ${sigma}: ${[0, 1, 2].map((mi) => MODES[mi].name + '=' + table[sigma][mi]).join(' ')}`)
    }
    console.log(rows.join('\n'))
    // slabý a střední šum: všechny režimy spolehlivě (sigma 0,5 při amplitudě 0,7 je pořád odstup ~19 dB v okně symbolu 300 Bd)
    for (const mi of [0, 1, 2]) expect(table[0.2][mi]).toBe(1)
    for (const mi of [0, 1, 2]) expect(table[0.5][mi]).toBeGreaterThanOrEqual(0.9)
    // při sigma 1 už nejrychlejší režim nestačí, nejrobustnější ještě ano
    expect(table[1][0]).toBeGreaterThanOrEqual(0.7)
    expect(table[1][2]).toBeLessThanOrEqual(0.2)
    // robustnější režim je při šumu aspoň tak dobrý jako rychlejší
    for (const sigma of [0.5, 1, 1.5, 2]) {
      expect(table[sigma][0]).toBeGreaterThanOrEqual(table[sigma][1])
      expect(table[sigma][1]).toBeGreaterThanOrEqual(table[sigma][2])
    }
  })

  it('odhad odstupu klesá s šumem a režim se podle něj volí', () => {
    const p = MODES[0].afsk
    const snrAt = (sigma: number) => {
      const x = makeChannel({ sigma, seed: 3 })(modulate([bytesOf(8)], p))
      const d = demodulate(x, p)
      return d.snr === undefined ? -Infinity : 10 * Math.log10(d.snr)
    }
    const a = snrAt(0.05)
    const b = snrAt(0.5)
    const c = snrAt(1)
    expect(a).toBeGreaterThan(b)
    expect(b).toBeGreaterThan(c)
    expect(chooseMode(a).id).toBe(2)
    expect(chooseMode(5).id).toBe(0)
    expect(chooseMode(30, 1).id).toBe(1)
  })
})
