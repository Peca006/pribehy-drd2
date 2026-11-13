import { describe, expect, it } from 'vitest'
import { rng } from './channel'
import { rsDecode, rsEncode } from './rs'

describe('Reed–Solomon', () => {
  const r = rng(11)
  const rand = (n: number) => Uint8Array.from({ length: n }, () => Math.floor(r() * 256))

  it('opraví až nroots/2 chybných bajtů na libovolných místech', () => {
    for (const [len, nroots] of [[52, 16], [10, 8], [200, 32], [1, 4]]) {
      for (let t = 0; t < 40; t++) {
        const data = rand(len)
        const w = rsEncode(data, nroots)
        expect(w.slice(0, len)).toEqual(data)
        const bad = w.slice()
        const errs = Math.floor(r() * (nroots / 2 + 1))
        const seen = new Set<number>()
        while (seen.size < errs) seen.add(Math.floor(r() * bad.length))
        for (const i of seen) bad[i] ^= 1 + Math.floor(r() * 255)
        const n = rsDecode(bad, nroots)
        expect(n).toBe(errs)
        expect(bad).toEqual(w)
      }
    }
  })

  it('víc chyb, než kód zvládne, se nevydává za správné (téměř vždy)', () => {
    let wrong = 0
    for (let t = 0; t < 200; t++) {
      const w = rsEncode(rand(52), 16)
      const bad = w.slice()
      for (let k = 0; k < 14; k++) bad[Math.floor(r() * bad.length)] ^= 1 + Math.floor(r() * 255)
      const n = rsDecode(bad, 16)
      if (n >= 0 && bad.some((v, i) => v !== w[i])) wrong++
    }
    expect(wrong).toBeLessThanOrEqual(2)
  })

  it('bez kontrolních bajtů nic neopravuje', () => {
    const d = rand(5)
    expect(rsEncode(d, 0)).toEqual(d)
    expect(rsDecode(d.slice(), 0)).toBe(0)
  })
})
