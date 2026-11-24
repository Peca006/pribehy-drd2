import { describe, expect, it } from 'vitest'
import { darkTheme } from '../../themes/default'
import { classifyViewport, resolveRoles, skinTheme, usedAssets, validateSkin } from './skin'

// Obrázky, role a ikony v manifestu (milník 2).

const minimal = (extra: Record<string, unknown> = {}) => ({
  schema: 1,
  id: 'zkusebni',
  name: 'Zkušební',
  version: '1.0.0',
  author: 'Test',
  license: 'CC0-1.0',
  scheme: 'dark',
  ...extra,
})

const withImages = (extra: Record<string, unknown> = {}) =>
  minimal({
    assets: { mramor: { file: 'assets/mramor.svg' }, ram: { file: 'assets/ram.png' } },
    roles: {
      background: { image: 'mramor', mode: 'repeat', size: 256 },
      panel: { image: 'ram', mode: 'slice', slice: 12 },
    },
    icons: { postavy: 'mramor' },
    ...extra,
  })

describe('manifest s obrázky', () => {
  it('přijme platný manifest a doplní výchozí hodnoty rolí', () => {
    const r = validateSkin(withImages({ iconStyle: { pixelated: true } }))
    expect(r.issues).toEqual([])
    expect(r.skin).toMatchObject({
      assets: { mramor: { file: 'assets/mramor.svg' }, ram: { file: 'assets/ram.png' } },
      roles: {
        background: { image: 'mramor', mode: 'repeat', size: 256 },
        panel: { image: 'ram', mode: 'slice', slice: [12, 12, 12, 12] },
      },
      icons: { postavy: 'mramor' },
      iconStyle: { pixelated: true },
    })
  })

  it.each([
    ['assets není objekt', { assets: [] }, 'assets'],
    [
      'název obrázku s velkým písmenem',
      { assets: { Mramor: { file: 'assets/a.png' } } },
      'assets.Mramor',
    ],
    [
      'dlouhý název obrázku',
      { assets: { [`a${'b'.repeat(40)}`]: { file: 'assets/a.png' } } },
      'assets.',
    ],
    ['obrázek bez souboru', { assets: { a: {} } }, 'assets.a'],
    ['soubor mimo assets/', { assets: { a: { file: 'jine/a.png' } } }, 'assets.a.file'],
    ['soubor s cestou ven', { assets: { a: { file: 'assets/../a.png' } } }, 'assets.a.file'],
    ['soubor s mezerou', { assets: { a: { file: 'assets/a b.png' } } }, 'assets.a.file'],
    ['soubor s absolutní cestou', { assets: { a: { file: '/assets/a.png' } } }, 'assets.a.file'],
    [
      'role na neexistující obrázek',
      { roles: { panel: { image: 'nic', mode: 'repeat' } } },
      'roles.panel.image',
    ],
    ['role bez režimu', { roles: { panel: { image: 'mramor' } } }, 'roles.panel.mode'],
    [
      'slice bez okrajů',
      { roles: { panel: { image: 'ram', mode: 'slice' } } },
      'roles.panel.slice',
    ],
    ['ikona na neexistující obrázek', { icons: { postavy: 'nic' } }, 'icons.postavy'],
    ['ikona bez textu', { icons: { postavy: 5 } }, 'icons.postavy'],
    ['icons není objekt', { icons: [] }, 'icons'],
    ['iconStyle s textem', { iconStyle: { pixelated: 'ano' } }, 'iconStyle'],
    [
      'role ve variantě na neexistující obrázek',
      {
        variants: [
          { when: { width: 'compact' }, roles: { panel: { image: 'nic', mode: 'repeat' } } },
        ],
      },
      'variants[0].roles.panel.image',
    ],
  ])('odmítne: %s', (_n, extra, path) => {
    const r = validateSkin(withImages(extra as Record<string, unknown>))
    expect(r.ok).toBe(false)
    expect(r.skin).toBeNull()
    expect(r.issues.some((i) => i.level === 'error' && i.path.startsWith(path))).toBe(true)
  })

  it('příliš mnoho obrázků', () => {
    const many = Object.fromEntries(
      Array.from({ length: 33 }, (_, i) => [`a${i}`, { file: `assets/a${i}.png` }]),
    )
    expect(
      validateSkin(minimal({ assets: many })).issues.some(
        (i) => i.level === 'error' && i.path === 'assets',
      ),
    ).toBe(true)
  })

  it('nepoužitý obrázek a neznámá role varují, ale nevadí', () => {
    const r = validateSkin(
      withImages({
        assets: {
          mramor: { file: 'assets/mramor.svg' },
          ram: { file: 'assets/ram.png' },
          navic: { file: 'assets/navic.png' },
        },
        roles: {
          okno: { image: 'ram', mode: 'repeat' },
          background: { image: 'mramor', mode: 'repeat' },
          panel: { image: 'ram', mode: 'stretch' },
        },
      }),
    )
    expect(r.ok).toBe(true)
    expect(r.issues).toContainEqual(
      expect.objectContaining({ level: 'warning', path: 'assets.navic' }),
    )
    expect(r.issues).toContainEqual(
      expect.objectContaining({ level: 'warning', path: 'roles.okno' }),
    )
  })

  it('obrázek použitý jen ve variantě nebo v ikoně se za nepoužitý nepovažuje', () => {
    const r = validateSkin(
      minimal({
        assets: { a: { file: 'assets/a.png' }, b: { file: 'assets/b.png' } },
        icons: { postavy: 'a' },
        variants: [{ when: { low: true }, roles: { panel: { image: 'b', mode: 'repeat' } } }],
      }),
    )
    expect(r.ok).toBe(true)
    expect(r.issues).toEqual([])
  })
})

describe('role podle viewportu a převod na téma', () => {
  const skin = validateSkin(
    withImages({
      variants: [
        { when: { width: 'compact' }, roles: { panel: null } },
        { when: { low: true }, roles: { background: { image: 'ram', mode: 'cover' } } },
      ],
    }),
  ).skin!

  it('varianta role nahradí nebo vypne a původní Háv se nemění', () => {
    expect(Object.keys(resolveRoles(skin, classifyViewport(1280, 800))).sort()).toEqual([
      'background',
      'panel',
    ])
    expect(Object.keys(resolveRoles(skin, classifyViewport(360, 800)))).toEqual(['background']) // panel vypnutý
    const landscape = resolveRoles(skin, { width: 'compact', orientation: 'landscape', low: true })
    expect(landscape.background).toMatchObject({ image: 'ram', mode: 'cover' })
    expect(skin.roles.panel).toBeDefined()
    expect(skin.roles.background).toMatchObject({ image: 'mramor' })
  })

  it('skinTheme přidá proměnné rolí, jen když jsou známé adresy obrázků', () => {
    const vp = classifyViewport(1280, 800)
    expect(
      Object.keys(skinTheme(skin, vp).tokens).filter((k) => k.startsWith('--drd-panel')),
    ).toEqual([])
    const t = skinTheme(skin, vp, { mramor: 'blob:http://x/1', ram: 'blob:http://x/2' })
    expect(t.tokens['--drd-background-image']).toBe('url("blob:http://x/1")')
    expect(t.tokens['--drd-panel-bi-source']).toBe('url("blob:http://x/2")')
    expect(t.tokens['--drd-bg']).toBe(darkTheme.tokens['--drd-bg']) // barvy zůstávají
  })

  it('usedAssets sebere obrázky z rolí, variant i ikon', () => {
    expect([...usedAssets(skin)].sort()).toEqual(['mramor', 'ram'])
  })
})
