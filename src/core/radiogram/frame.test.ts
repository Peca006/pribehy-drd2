import { describe, expect, it } from 'vitest'
import { rng } from './channel'
import { crc16, crc32 } from './crc'
import { AUTO_MODE } from './modes'
import { decodeMsg, encodeMsg, FrameAssembler, Type, unwrapPhy, wrapPhy } from './frame'

const bytesOf = (n: number, seed = 7) => {
  const r = rng(seed)
  return Uint8Array.from({ length: n }, () => Math.floor(r() * 256))
}
const bitsOf = (b: Uint8Array) => [...b].flatMap((v) => Array.from({ length: 8 }, (_, i) => (v >> (7 - i)) & 1))

describe('CRC a rámce', () => {
  it('známé hodnoty', () => {
    const t = new TextEncoder().encode('123456789')
    expect(crc16(t)).toBe(0x29b1)
    expect(crc32(t)).toBe(0xcbf43926)
  })

  it('wrap/unwrap s Reed–Solomonem i bez něj, oprava a detekce poškození', () => {
    for (const nroots of [0, 16]) {
      const w = wrapPhy(bytesOf(20), nroots)
      expect(unwrapPhy(w, nroots)?.payload).toEqual(bytesOf(20))
      const bad = w.slice()
      bad[5] ^= 0x10
      if (nroots === 0) expect(unwrapPhy(bad, 0)).toBeUndefined()
      else expect(unwrapPhy(bad, 16)).toMatchObject({ corrected: 1 })
    }
    const w = wrapPhy(bytesOf(20), 16)
    for (let i = 3; i < 3 + 9; i++) w[i] ^= 0xff // 9 chybných bajtů je nad možnostmi kódu
    expect(unwrapPhy(w, 16)).toBeUndefined()
    const h = wrapPhy(bytesOf(20), 16)
    h[1] ^= 1 // poškozená hlavička (délka a doplněk nesouhlasí)
    expect(unwrapPhy(h, 16)).toBeUndefined()
  })

  it('skládání rámce z bitů pozná délku a konec', () => {
    const w = wrapPhy(bytesOf(30), 8)
    const a = new FrameAssembler(8)
    const bits = bitsOf(w)
    bits.forEach((b, i) => {
      expect(a.done).toBe(false)
      a.push(b)
      if (i < bits.length - 1) expect(a.result).toBeUndefined()
    })
    expect(a.result?.payload).toEqual(bytesOf(30))
  })

  it('zprávy protokolu se překlopí tam a zpět', () => {
    const msgs = [
      { type: Type.Call, session: 3, size: 123456, frames: 2572, crc: 0xdeadbeef, maxMode: 2, mode: AUTO_MODE },
      { type: Type.Ready, session: 3, snr: -5, mode: 1 },
      { type: Type.Data, session: 3, seq: 300, data: bytesOf(48) },
      { type: Type.Ack, session: 3, map: Uint8Array.from([255, 1]) },
    ] as const
    for (const m of msgs) expect(decodeMsg(encodeMsg(m))).toEqual(m)
  })
})
