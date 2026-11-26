import { describe, expect, it } from 'vitest'
import { BUILTIN_SKINS } from '../../themes/havy'
import { blankSkin } from './editor'
import { addAsset, defaultRole, removeAsset } from './editor-assets'
import {
  addVariant,
  coverage,
  moveVariant,
  removeVariant,
  setVariantRole,
  setVariantToken,
  setVariantWhen,
  viewportsOf,
  whenLabel,
} from './editor-variants'
import { ALL_VIEWPORTS, MAX_VARIANTS, resolveRoles, resolveTokens, validateSkin, type Skin } from './skin'

function png(w: number, h: number): Uint8Array {
  const b = new Uint8Array(40)
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52])
  const v = new DataView(b.buffer)
  v.setUint32(16, w)
  v.setUint32(20, h)
  return b
}

describe('podmínky a pokrytí', () => {
  it('viewportsOf odpovídá počtu kombinací z 12', () => {
    expect(viewportsOf({ width: 'compact' })).toHaveLength(4)
    expect(viewportsOf({ orientation: 'landscape', low: true })).toHaveLength(3)
    expect(viewportsOf({ width: 'expanded', orientation: 'portrait', low: false })).toHaveLength(1)
    expect(ALL_VIEWPORTS).toHaveLength(12)
  })
  it('whenLabel je česky čitelný', () => {
    expect(whenLabel({ width: 'expanded', orientation: 'landscape' })).toBe('široký, na šířku')
    expect(whenLabel({ low: true })).toBe('nízký')
    expect(whenLabel({})).toBe('všechna okna')
  })
  it('coverage ukáže, které varianty platí pro každé okno', () => {
    let s = addVariant(blankSkin('dark'), { low: true }).skin
    s = addVariant(s, { width: 'expanded' }).skin
    const rows = coverage(s)
    expect(rows).toHaveLength(12)
    expect(rows.find((r) => r.viewport.width === 'expanded' && r.viewport.low)!.variants).toEqual([1, 2])
    expect(rows.find((r) => r.viewport.width === 'compact' && !r.viewport.low)!.variants).toEqual([])
  })
})

describe('správa variant', () => {
  it('přidání vyžaduje podmínku a hlídá počet', () => {
    const s = blankSkin('dark')
    expect(addVariant(s, {}).error).not.toBeNull()
    let cur = s
    for (let i = 0; i < MAX_VARIANTS; i++) cur = addVariant(cur, { low: true }).skin
    expect(cur.variants).toHaveLength(MAX_VARIANTS)
    expect(addVariant(cur, { low: true }).error).toMatch(/16/)
  })

  it('pořadí jde měnit a varianta jde odebrat', () => {
    let s = addVariant(blankSkin('dark'), { width: 'compact' }).skin
    s = addVariant(s, { low: true }).skin
    s = moveVariant(s, 1, -1)
    expect(s.variants.map((v) => v.when)).toEqual([{ low: true }, { width: 'compact' }])
    expect(moveVariant(s, 0, -1)).toBe(s)
    expect(removeVariant(s, 0).variants).toEqual([{ when: { width: 'compact' }, tokens: {} }])
  })

  it('podmínku nelze vyprázdnit', () => {
    const s = addVariant(blankSkin('dark'), { low: true }).skin
    expect(setVariantWhen(s, 0, {}).error).not.toBeNull()
    expect(setVariantWhen(s, 0, { orientation: 'landscape' }).skin.variants[0]!.when).toEqual({ orientation: 'landscape' })
    expect(setVariantWhen(s, 5, { low: true }).error).not.toBeNull()
  })
})

describe('přepsání tokenů', () => {
  it('platná hodnota se uloží a promítne do rozlišených tokenů jen pro odpovídající okno', () => {
    let s = addVariant(blankSkin('dark'), { low: true }).skin
    s = setVariantToken(s, 0, '--drd-gap', '0.5rem').skin
    const low = ALL_VIEWPORTS.find((v) => v.low)!
    const normal = ALL_VIEWPORTS.find((v) => !v.low)!
    expect(resolveTokens(s, low)['--drd-gap']).toBe('0.5rem')
    expect(resolveTokens(s, normal)['--drd-gap']).not.toBe('0.5rem')
    expect(validateSkin(s).ok).toBe(true)
  })

  it('nesmysl se odmítne, prázdná hodnota přepsání odstraní', () => {
    let s = addVariant(blankSkin('dark'), { low: true }).skin
    expect(setVariantToken(s, 0, '--drd-gap', 'url(x)').error).not.toBeNull()
    s = setVariantToken(s, 0, '--drd-gap', '0.5rem').skin
    expect(setVariantToken(s, 0, '--drd-gap', '').skin.variants[0]!.tokens).toEqual({})
  })

  it('varianta, která zhorší kontrast, je pro Háv chyba (hlídá validace)', () => {
    let s = addVariant(blankSkin('dark'), { low: true }).skin
    s = setVariantToken(s, 0, '--drd-bg', '#f5f5f5').skin
    expect(validateSkin(s).ok).toBe(false)
  })
})

describe('role ve variantě', () => {
  const base = (): Skin => {
    const a = addAsset(blankSkin('dark'), [], 'zahlavi.png', png(64, 32))
    return addVariant(a.skin, { low: true }).skin
  }

  it('lze roli nahradit, vypnout i vrátit základní', () => {
    let s = base()
    s = setVariantRole(s, 0, 'header', defaultRole('header', 'zahlavi')).skin
    expect(s.variants[0]!.roles?.header?.image).toBe('zahlavi')
    s = setVariantRole(s, 0, 'header', null).skin
    expect(s.variants[0]!.roles).toEqual({ header: null })
    // vypnutá role se uplatní: ve variantě nízkého okna záhlaví není
    const low = ALL_VIEWPORTS.find((v) => v.low)!
    expect(resolveRoles(s, low).header).toBeUndefined()
    s = setVariantRole(s, 0, 'header', undefined).skin
    expect(s.variants[0]!.roles).toEqual({})
    expect(validateSkin(s).ok).toBe(true)
  })

  it('neplatná role ve variantě vrátí důvod a Háv nezmění', () => {
    const s = base()
    const r = setVariantRole(s, 0, 'header', { image: 'zahlavi', mode: 'repeat-x' })
    expect(r.error).toMatch(/výšk/)
    expect(r.skin).toBe(s)
    expect(setVariantRole(s, 0, 'panel', { image: 'neni', mode: 'stretch' }).error).not.toBeNull()
  })

  it('odebrání obrázku odstraní i jeho použití ve variantě', () => {
    const a = addAsset(blankSkin('dark'), [], 'x.png', png(16, 16))
    let s = addVariant(a.skin, { low: true }).skin
    s = setVariantRole(s, 0, 'panel', defaultRole('panel', 'x')).skin
    const r = removeAsset(s, a.assets, 'x')
    expect(r.skin.variants[0]!.roles).toEqual({})
    expect(validateSkin(r.skin).ok).toBe(true)
  })
})

describe('vestavěný Háv s variantami', () => {
  it('Podzemí jde upravit: přidání další varianty ho nerozbije', () => {
    const podzemi = BUILTIN_SKINS.find((s) => s.id === 'podzemi')!
    const s = addVariant(podzemi, { width: 'medium', orientation: 'portrait' }).skin
    expect(validateSkin(s, { allowReserved: true }).ok).toBe(true)
  })
})
