import { describe, expect, it } from 'vitest'
import { QR_CHUNK, QrAssembler, splitForQr } from './qr'

const code = 'DRD2:' + 'abcdefghij'.repeat(250) // 2505 znaků, 4 díly

describe('dělení kódu na QR', () => {
  it('krátký kód se nedělí', () => {
    expect(splitForQr('DRD2:abc')).toEqual(['DRD2:abc'])
  })

  it('dlouhý kód se rozdělí a složí zpět, i v jiném pořadí a s opakováním', () => {
    const parts = splitForQr(code)
    expect(parts.length).toBe(Math.ceil(code.length / QR_CHUNK))
    expect(parts.every((p) => p.length <= QR_CHUNK + 20)).toBe(true)
    const a = new QrAssembler()
    const order = [2, 0, 0, 1].map((i) => parts[i])
    const states = order.map((p) => a.add(p))
    expect(states.map((s) => s.status)).toEqual(['partial', 'partial', 'partial', 'partial'])
    expect(states[3]).toEqual({ status: 'partial', have: 3, total: 4 })
    expect(a.add(parts[3]).status).toBe('complete')
  })

  it('složený kód je shodný s původním', () => {
    const parts = splitForQr(code)
    const a = new QrAssembler()
    let r
    for (const p of parts) r = a.add(p)
    expect(r).toEqual({ status: 'complete', code })
  })

  it('cizí text se ignoruje a jiná sada dílů začne znovu', () => {
    const a = new QrAssembler()
    expect(a.add('https://example.com').status).toBe('ignored')
    expect(a.add('DRD2Q:ab12.9.3.x').status).toBe('ignored')
    const p1 = splitForQr(code)
    const p2 = splitForQr(code.replace('a', 'z'))
    a.add(p1[0])
    expect(a.add(p2[1])).toMatchObject({ status: 'partial', have: 1 })
    expect(a.add('DRD2:krátký')).toEqual({ status: 'complete', code: 'DRD2:krátký' })
  })
})
