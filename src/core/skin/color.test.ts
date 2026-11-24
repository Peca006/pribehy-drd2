import { describe, expect, it } from 'vitest'
import { contrastRatio, parseColor } from './color'

describe('parseColor', () => {
  it.each([
    ['#fff', { r: 255, g: 255, b: 255, a: 1 }],
    ['#1c1a17', { r: 28, g: 26, b: 23, a: 1 }],
    ['#0008', { r: 0, g: 0, b: 0, a: 136 / 255 }],
    ['rgb(0 0 0 / 0.6)', { r: 0, g: 0, b: 0, a: 0.6 }],
    ['rgba(10, 20, 30, 0.5)', { r: 10, g: 20, b: 30, a: 0.5 }],
    ['rgb(100% 0% 0%)', { r: 255, g: 0, b: 0, a: 1 }],
    ['hsl(0 100% 50%)', { r: 255, g: 0, b: 0, a: 1 }],
    ['hsla(120deg, 100%, 25%, 50%)', { r: 0, g: 127.5, b: 0, a: 0.5 }],
  ])('přijme %s', (input, expected) => {
    const c = parseColor(input)!
    expect(c).not.toBeNull()
    for (const k of ['r', 'g', 'b', 'a'] as const) expect(c[k]).toBeCloseTo(expected[k], 5)
  })

  it.each([
    'red',
    'transparent',
    '#12',
    '#12345',
    'rgb(256 0 0)',
    'rgb(0 0)',
    'rgb(0 0 0 / 2)',
    'hsl(0 100 50)',
    'rgb(0 0 0); x',
    'url(x)',
    '',
    'var(--x)',
  ])('odmítne %s', (input) => expect(parseColor(input)).toBeNull())
})

describe('contrastRatio', () => {
  const black = parseColor('#000')!
  const white = parseColor('#fff')!
  it('černá na bílé je 21:1, shodné barvy 1:1', () => {
    expect(contrastRatio(black, white)).toBeCloseTo(21, 5)
    expect(contrastRatio(white, black)).toBeCloseTo(21, 5)
    expect(contrastRatio(white, white)).toBeCloseTo(1, 5)
  })
  it('průhlednou barvu položí na pozadí', () => {
    expect(contrastRatio(parseColor('#0000')!, white)).toBeCloseTo(1, 5)
    expect(contrastRatio(parseColor('rgb(0 0 0 / 1)')!, white)).toBeCloseTo(21, 5)
  })
})
