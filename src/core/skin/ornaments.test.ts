import { describe, expect, it } from 'vitest'
import {
  ORNAMENT_GAP,
  placeOrnaments,
  validateOrnaments,
  type Geometry,
  type Ornament,
} from './ornaments'

const ASSETS = new Set(['roh'])
const run = (raw: unknown) => {
  const issues: string[] = []
  const out = validateOrnaments(raw, 'ornaments', ASSETS, (l, p) => issues.push(`${l}:${p}`))
  return { out, issues }
}

describe('validateOrnaments', () => {
  it('bez položky nic; platné ozdoby projdou', () => {
    expect(run(undefined)).toEqual({ out: [], issues: [] })
    const r = run([{ image: 'roh', anchor: 'top-left', width: 96 }])
    expect(r.issues).toEqual([])
    expect(r.out).toEqual([{ image: 'roh', anchor: 'top-left', width: 96 }])
  })

  it('neplatný obrázek, kotva nebo šířka je chyba a ozdoba se zahodí', () => {
    for (const o of [
      { image: 'nic', anchor: 'top-left', width: 96 },
      { image: 'roh', anchor: 'center', width: 96 },
      { image: 'roh', anchor: 'top-left', width: 8 },
      { image: 'roh', anchor: 'top-left', width: 500 },
      { image: 'roh', anchor: 'top-left', width: 9.5 },
    ]) {
      const r = run([o])
      expect(r.issues.some((i) => i.startsWith('error:'))).toBe(true)
      expect(r.out).toEqual([])
    }
    expect(run('x').issues[0]).toMatch(/^error:/)
  })

  it('nejvýše osm ozdob', () => {
    const many = Array.from({ length: 9 }, () => ({ image: 'roh', anchor: 'top-left', width: 32 }))
    const r = run(many)
    expect(r.issues.some((i) => i.startsWith('error:'))).toBe(true)
    expect(r.out).toHaveLength(8)
  })
})

describe('placeOrnaments', () => {
  const geo: Geometry = {
    viewportWidth: 1400,
    pageLeft: 80,
    pageRight: 1400,
    mainLeft: 388,
    mainRight: 1092,
    topInset: 0,
    bottomInset: 20,
  }
  const o = (anchor: Ornament['anchor'], width = 96): Ornament => ({ image: 'roh', anchor, width })

  it('vejde-li se do volného okraje, zobrazí se u příslušného rohu s odstupem', () => {
    const placed = placeOrnaments([o('top-left'), o('bottom-right')], geo)
    expect(placed).toHaveLength(2)
    expect(placed[0]).toMatchObject({ x: 80 + ORNAMENT_GAP, y: ORNAMENT_GAP })
    expect(placed[1]).toMatchObject({ x: 1400 - 1400 + ORNAMENT_GAP, y: 20 + ORNAMENT_GAP })
  })

  it('nevejde-li se (úzké okno), nezobrazí se; obsah se nikdy nepřekryje', () => {
    expect(placeOrnaments([o('top-left')], { ...geo, mainLeft: 120 })).toEqual([])
    expect(placeOrnaments([o('top-right', 300)], geo)).toEqual([])
    // telefon: sloupec obsahu zabírá celou šířku
    expect(
      placeOrnaments([o('top-left'), o('top-right')], {
        ...geo,
        pageLeft: 0,
        mainLeft: 0,
        mainRight: 400,
        pageRight: 400,
        viewportWidth: 400,
      }),
    ).toEqual([])
  })
})
