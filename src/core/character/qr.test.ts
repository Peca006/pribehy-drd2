import { describe, expect, it } from 'vitest'
import { beforeEach } from 'vitest'
import {
  QR_CHUNK,
  QrAssembler,
  fromScan,
  loadAssembler,
  saveAssembler,
  splitForQr,
  toLink,
} from './qr'

const code = 'DRD2:' + 'abcdefghij'.repeat(250) // 2505 znaků, 4 díly

describe('dělení kódu na QR', () => {
  it('krátký kód se nedělí', () => {
    expect(splitForQr('DRD2:abc')).toEqual(['DRD2:abc'])
  })

  it('dlouhý kód se rozdělí na stejně velké díly a složí zpět, i v jiném pořadí a s opakováním', () => {
    const parts = splitForQr(code)
    const n = parts.length
    expect(n).toBe(Math.ceil(code.length / QR_CHUNK))
    expect(n).toBeGreaterThan(3)
    const sizes = parts.map((p) => p.split('.')[3].length)
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1)
    expect(Math.max(...sizes)).toBeLessThanOrEqual(QR_CHUNK)
    const a = new QrAssembler()
    const first = [2, 0, 0, 1].map((i) => a.add(parts[i]))
    expect(first.map((x) => x.status)).toEqual(['partial', 'partial', 'partial', 'partial'])
    expect(first[3]).toEqual({ status: 'partial', have: 3, total: n })
    const rest = parts.slice(3).map((p) => a.add(p))
    expect(rest.slice(0, -1).every((x) => x.status === 'partial')).toBe(true)
    expect(rest[rest.length - 1].status).toBe('complete')
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

const store = new Map<string, string>()
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
} as Storage

describe('QR s odkazem do aplikace', () => {
  beforeEach(() => store.clear())
  const base = 'https://example.github.io/app/'

  it('odkaz nese kód a čtečka ho z něj zase vybere', () => {
    const link = toLink('DRD2:abc-_', base)
    expect(link).toBe('https://example.github.io/app/#/postavy/import/DRD2:abc-_')
    expect(fromScan(link)).toBe('DRD2:abc-_')
    expect(fromScan('  DRD2:holý  ')).toBe('DRD2:holý')
    const part = splitForQr('DRD2:' + 'x'.repeat(600))[1]
    expect(fromScan(toLink(part, base))).toBe(part)
  })

  it('díly z odkazů se skládají i mezi jednotlivými otevřeními aplikace', () => {
    const code = 'DRD2:' + 'abcdefghij'.repeat(60)
    const parts = splitForQr(code).map((p) => toLink(p, base))
    expect(parts.length).toBeGreaterThan(2)
    let last
    for (const p of parts) {
      const a = loadAssembler() // nové otevření aplikace = nový složeč, díly jsou v úložišti
      last = a.add(fromScan(p))
      saveAssembler(a)
    }
    expect(last).toEqual({ status: 'complete', code })
    expect(loadAssembler().snapshot().parts).toEqual([])
  })

  it('poškozená nebo stará uložená data se ignorují', () => {
    store.set('drd2-qr-parts', '{nesmysl')
    expect(loadAssembler().snapshot().parts).toEqual([])
    store.set('drd2-qr-parts', JSON.stringify({ id: 'ab', total: 2, parts: [[1, 'x']], at: 1 }))
    expect(loadAssembler().snapshot().parts).toEqual([])
  })
})
