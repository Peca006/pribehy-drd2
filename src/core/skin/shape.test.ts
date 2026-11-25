import { describe, expect, it } from 'vitest'
import { clipPath, shapeVariables } from './shape'
import { tokenValueError } from './tokens'

describe('tvary ploch (M3b)', () => {
  it('rect nemá ořez, chamfer seřízne čtyři rohy a notch dva protilehlé', () => {
    expect(clipPath('rect', 6)).toBeNull()
    expect(clipPath('chamfer', 6)?.match(/,/g)).toHaveLength(7) // osm bodů
    expect(clipPath('notch', 6)?.match(/,/g)).toHaveLength(5) // šest bodů
    expect(clipPath('notch', 6)).toMatch(/^polygon\(6px 0,/)
  })

  it('proměnné vzniknou jen pro plochy s tvarem a velikost se bere z tokenu', () => {
    const v = shapeVariables({
      '--drd-shape-panel': 'rect',
      '--drd-shape-button': 'chamfer',
      '--drd-shape-dialog': 'notch',
      '--drd-shape-size': '10px',
    })
    expect(v['--drd-clip-panel']).toBeUndefined()
    expect(v['--drd-clip-button']).toContain('10px')
    expect(v['--drd-clip-dialog']).toContain('10px')
    expect(v['--drd-focus-offset']).toBe('-3px') // ohnisko tlačítka nesmí zmizet
  })

  it('bez tvaru tlačítka se ohnisko nemění; neznámý tvar a chybějící velikost spadnou na výchozí', () => {
    expect(shapeVariables({ '--drd-shape-dialog': 'chamfer' })['--drd-focus-offset']).toBeUndefined()
    expect(shapeVariables({ '--drd-shape-panel': 'oval' })).toEqual({})
    expect(shapeVariables({ '--drd-shape-panel': 'chamfer' })['--drd-clip-panel']).toContain('6px')
  })

  it('validace tokenů tvaru: jen výčet a velikost 2 až 16 px', () => {
    expect(tokenValueError('--drd-shape-panel', 'chamfer')).toBeNull()
    expect(tokenValueError('--drd-shape-button', 'polygon(0 0)')).not.toBeNull()
    expect(tokenValueError('--drd-shape-size', '8px')).toBeNull()
    expect(tokenValueError('--drd-shape-size', '1px')).not.toBeNull()
    expect(tokenValueError('--drd-shape-size', '40px')).not.toBeNull()
  })
})
