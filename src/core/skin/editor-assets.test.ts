import { describe, expect, it } from 'vitest'
import { BUILTIN_ASSETS, BUILTIN_SKINS } from '../../themes/havy'
import { blankSkin } from './editor'
import {
  addAsset,
  assetLimitError,
  assetNameFor,
  assetStats,
  defaultRole,
  patchedRole,
  removeAsset,
  setIcon,
  setOrnaments,
  setRole,
  usesOf,
} from './editor-assets'
import type { AssetFile } from './file'
import { MAX_ASSET_BYTES } from './file'
import { validateSkin } from './skin'

/** Platný PNG pro kontrolu (podpis a blok IHDR s rozměry; obsah obrazových dat se nekontroluje). */
function png(w: number, h: number): Uint8Array {
  const b = new Uint8Array(40)
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52])
  const v = new DataView(b.buffer)
  v.setUint32(16, w)
  v.setUint32(20, h)
  return b
}
const svg = (body = '<rect width="4" height="4"/>') =>
  new TextEncoder().encode(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 4">${body}</svg>`)

describe('přidání obrázku', () => {
  it('platný PNG se přidá s jedinečným názvem a cestou pod assets/', () => {
    const a = addAsset(blankSkin('dark'), [], 'Mramor Šedý.PNG', png(64, 32))
    expect(a.error).toBeNull()
    expect(a.name).toBe('mramor-sedy')
    expect(a.skin.assets['mramor-sedy']).toEqual({ file: 'assets/mramor-sedy.png' })
    expect(a.assets).toHaveLength(1)
    const b = addAsset(a.skin, a.assets, 'mramor-sedy.png', png(8, 8))
    expect(b.name).toBe('mramor-sedy-2')
    expect(validateSkin(b.skin).issues.filter((i) => i.level === 'error')).toEqual([])
  })

  it('odmítne cizí obsah, SVG se skriptem, obří a příliš velký soubor', () => {
    const s = blankSkin('dark')
    expect(addAsset(s, [], 'x.png', new TextEncoder().encode('to není obrázek')).error).toMatch(/x\.png/)
    expect(addAsset(s, [], 'a.svg', svg('<script>alert(1)</script>')).error).toMatch(/SVG/)
    expect(addAsset(s, [], 'a.svg', svg('<image href="http://evil/x.png"/>')).error).toMatch(/SVG/)
    expect(addAsset(s, [], 'b.png', png(5000, 10)).error).toMatch(/4096/)
    expect(addAsset(s, [], 'c.png', new Uint8Array(MAX_ASSET_BYTES + 1)).error).toMatch(/MB/)
    // Háv po odmítnutí zůstal beze změny
    expect(addAsset(s, [], 'x.png', new Uint8Array(20)).skin).toBe(s)
  })

  it('hlídá počet obrázků a součet pixelů', () => {
    let s = blankSkin('dark')
    let assets: AssetFile[] = []
    for (let i = 0; i < 32; i++) {
      const r = addAsset(s, assets, `o${i}.png`, png(8, 8))
      expect(r.error).toBeNull()
      s = r.skin
      assets = r.assets
    }
    expect(addAsset(s, assets, 'dalsi.png', png(8, 8)).error).toMatch(/32/)
    const big: AssetFile[] = [
      { name: 'a', type: 'image/png', bytes: new Uint8Array(8), width: 4096, height: 2048 },
      { name: 'b', type: 'image/png', bytes: new Uint8Array(8), width: 4096, height: 2048 },
      { name: 'c', type: 'image/png', bytes: new Uint8Array(8), width: 10, height: 10 },
    ]
    expect(assetLimitError(big)).toMatch(/pixel/)
    expect(assetStats(big).count).toBe(3)
  })

  it('assetNameFor vyrobí platný název', () => {
    expect(assetNameFor('Ikona – Hrad (1).svg', [])).toBe('ikona-hrad-1')
    expect(assetNameFor('???.png', [])).toBe('obrazek')
    expect(assetNameFor('x'.repeat(80) + '.png', []).length).toBeLessThanOrEqual(32)
  })
})

describe('role', () => {
  const withImage = () => addAsset(blankSkin('dark'), [], 'ram.png', png(48, 48))

  it('platná role se přijme, neplatná vrátí důvod a Háv nezmění', () => {
    const { skin } = withImage()
    const ok = setRole(skin, 'panel', { image: 'ram', mode: 'slice', slice: [8, 8, 8, 8] })
    expect(ok.error).toBeNull()
    expect(ok.skin.roles.panel?.image).toBe('ram')
    const noImage = setRole(skin, 'panel', { image: 'neni', mode: 'stretch' })
    expect(noImage.error).toMatch(/obrázek/)
    expect(noImage.skin).toBe(skin)
    expect(setRole(skin, 'panel', { image: 'ram', mode: 'slice' }).error).toMatch(/slice/)
    // záhlaví potřebuje výšku
    expect(setRole(skin, 'header', { image: 'ram', mode: 'repeat-x' }).error).toMatch(/výšk/)
    expect(setRole(skin, 'header', defaultRole('header', 'ram')).error).toBeNull()
  })

  it('role jde vypnout a výchozí role každého druhu jsou platné', () => {
    const { skin } = withImage()
    const on = setRole(skin, 'background', defaultRole('background', 'ram')).skin
    expect(setRole(on, 'background', null).skin.roles.background).toBeUndefined()
    for (const r of ['background', 'panel', 'button', 'tab', 'divider', 'dialog', 'header'] as const)
      expect(setRole(skin, r, defaultRole(r, 'ram')).error, r).toBeNull()
  })
})

describe('ikony a ozdoby', () => {
  it('ikona míří jen na existující obrázek', () => {
    const { skin } = addAsset(blankSkin('dark'), [], 'gem.svg', svg())
    expect(setIcon(skin, 'postavy', 'gem').skin.icons).toEqual({ postavy: 'gem' })
    expect(setIcon(skin, 'postavy', 'neni').error).not.toBeNull()
    expect(setIcon(setIcon(skin, 'postavy', 'gem').skin, 'postavy', null).skin.icons).toEqual({})
  })

  it('ozdoby se ověřují (kotva, šířka, obrázek)', () => {
    const { skin } = addAsset(blankSkin('dark'), [], 'roh.png', png(32, 32))
    const ok = setOrnaments(skin, [{ image: 'roh', anchor: 'top-left', width: 96 }])
    expect(ok.error).toBeNull()
    expect(ok.skin.ornaments).toHaveLength(1)
    expect(setOrnaments(skin, [{ image: 'roh', anchor: 'top-left', width: 500 }]).error).not.toBeNull()
    expect(setOrnaments(skin, [{ image: 'neni', anchor: 'top-left', width: 96 }]).skin).toBe(skin)
  })
})

describe('odebrání obrázku', () => {
  it('odstraní i všechna místa, která ho používají, a Háv zůstane platný', () => {
    const base = addAsset(blankSkin('dark'), [], 'gem.png', png(16, 16))
    let s = base.skin
    s = setRole(s, 'panel', defaultRole('panel', 'gem')).skin
    s = setIcon(s, 'postavy', 'gem').skin
    s = setOrnaments(s, [{ image: 'gem', anchor: 'top-left', width: 64 }]).skin
    expect(usesOf(s, 'gem')).toEqual(['role panel', 'ikona postavy', 'ozdoba 1'])
    const r = removeAsset(s, base.assets, 'gem')
    expect(r.assets).toEqual([])
    expect(r.skin.assets).toEqual({})
    expect(r.skin.roles).toEqual({})
    expect(r.skin.icons).toEqual({})
    expect(r.skin.ornaments).toEqual([])
    expect(validateSkin(r.skin).ok).toBe(true)
  })

  it('odebrání z vestavěného Hávu s variantami nezanechá visící odkaz', () => {
    const podzemi = BUILTIN_SKINS.find((x) => x.id === 'podzemi')!
    const files = [...BUILTIN_ASSETS.podzemi!]
    const some = Object.keys(podzemi.assets)[0]!
    const r = removeAsset(podzemi, files, some)
    expect(validateSkin(r.skin, { allowReserved: true }).issues.filter((i) => i.level === 'error')).toEqual([])
    expect(usesOf(r.skin, some)).toEqual([])
  })
})

describe('patchedRole', () => {
  it('přepnutí na rámeček doplní okraje, přepnutí pryč je zruší spolu s dlaždicí', () => {
    const r = patchedRole({ image: 'a', mode: 'repeat', size: 64 }, { mode: 'slice' })
    expect(r.slice).toEqual([12, 12, 12, 12])
    expect(r.size).toBeUndefined()
    const back = patchedRole({ ...r, edge: 'repeat', fill: false }, { mode: 'stretch' })
    expect(back).toEqual({ image: 'a', mode: 'stretch' })
  })
})
