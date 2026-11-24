import { describe, expect, it } from 'vitest'
import { darkTheme, lightTheme } from '../../themes/default'
import {
  ALL_VIEWPORTS,
  classifyViewport,
  contrastIssues,
  MAX_VARIANTS,
  resolveTokens,
  skinTheme,
  validateSkin,
  type Skin,
} from './skin'

const minimal = (extra: Record<string, unknown> = {}) => ({
  schema: 1,
  id: 'svitek',
  name: 'Pergamen',
  version: '1.0.0',
  author: 'Test',
  license: 'CC0-1.0',
  scheme: 'light',
  ...extra,
})

const errors = (raw: unknown, opts?: { appVersion?: string }) =>
  validateSkin(raw, opts).issues.filter((i) => i.level === 'error')

describe('classifyViewport', () => {
  it.each([
    [360, 800, { width: 'compact', orientation: 'portrait', low: false }],
    [800, 360, { width: 'medium', orientation: 'landscape', low: true }],
    [768, 1024, { width: 'medium', orientation: 'portrait', low: false }],
    [1024, 768, { width: 'expanded', orientation: 'landscape', low: false }],
    [599, 900, { width: 'compact', orientation: 'portrait', low: false }],
    [600, 900, { width: 'medium', orientation: 'portrait', low: false }],
    [1000, 900, { width: 'medium', orientation: 'landscape', low: false }],
    [1001, 479, { width: 'expanded', orientation: 'landscape', low: true }],
  ])('%i×%i', (w, h, expected) => expect(classifyViewport(w, h)).toEqual(expected))

  it('pokrývá všech 12 kombinací', () => expect(ALL_VIEWPORTS).toHaveLength(12))
})

describe('výchozí skiny', () => {
  it.each([lightTheme, darkTheme])('$id splňuje kontrast bez varování', (theme) => {
    const skin: Skin = {
      schema: 1,
      id: 'x',
      name: 'x',
      version: '1.0.0',
      author: 'x',
      license: 'x',
      scheme: theme.scheme,
      tokens: {},
      variants: [],
    }
    expect(contrastIssues(skin)).toEqual([])
  })
})

describe('validateSkin: manifest', () => {
  it('přijme minimální manifest a doplní prázdné tokeny a varianty', () => {
    const r = validateSkin(minimal())
    expect(r.ok).toBe(true)
    expect(r.issues).toEqual([])
    expect(r.skin).toMatchObject({ id: 'svitek', scheme: 'light', tokens: {}, variants: [] })
  })

  it('odmítne ne-objekt a špatné schema', () => {
    expect(validateSkin(null).ok).toBe(false)
    expect(validateSkin([]).ok).toBe(false)
    expect(validateSkin('x').ok).toBe(false)
    expect(errors({})).toEqual([expect.objectContaining({ path: 'schema' })])
    expect(errors(minimal({ schema: 2 }))[0]).toMatchObject({ path: 'schema' })
  })

  it.each([
    ['id', 'Pergamen'],
    ['id', 'a b'],
    ['id', '-a'],
    ['id', 'a--b'],
    ['id', 'system'],
    ['id', 'default-dark'],
    ['version', '1.0'],
    ['version', 'v1.0.0'],
    ['scheme', 'sepia'],
    ['license', ''],
    ['name', 'x'.repeat(61)],
    ['author', 'a\nb'],
    ['minApp', '0.5'],
  ])('odmítne %s = %j', (key, value) => {
    expect(errors(minimal({ [key]: value })).some((i) => i.path === key)).toBe(true)
  })

  it('chybějící povinné položky jsou chyby', () => {
    const raw: Record<string, unknown> = minimal()
    for (const key of ['id', 'name', 'version', 'author', 'license', 'scheme']) {
      const copy = { ...raw }
      delete copy[key]
      expect(errors(copy).some((i) => i.path === key)).toBe(true)
    }
  })

  it('neznámé položky varují, ale nevadí', () => {
    const r = validateSkin(minimal({ extra: 1 }))
    expect(r.ok).toBe(true)
    expect(r.issues).toEqual([{ level: 'warning', path: 'extra', message: expect.any(String) }])
    expect(r.skin).not.toHaveProperty('extra')
  })

  it('assets: prázdné projde, neprázdné varuje a ignoruje se', () => {
    expect(validateSkin(minimal({ assets: {} })).issues).toEqual([])
    const r = validateSkin(minimal({ assets: { bg: 'assets/bg.png' } }))
    expect(r.ok).toBe(true)
    expect(r.issues).toEqual([expect.objectContaining({ level: 'warning', path: 'assets' })])
  })

  it('minApp: novější než aplikace je chyba', () => {
    expect(errors(minimal({ minApp: '0.6.0' }), { appVersion: '0.5.0' })[0]).toMatchObject({
      path: 'minApp',
    })
    expect(validateSkin(minimal({ minApp: '0.5.0' }), { appVersion: '0.5.0' }).ok).toBe(true)
    expect(validateSkin(minimal({ minApp: '0.4.11' }), { appVersion: '0.5.0' }).skin?.minApp).toBe(
      '0.4.11',
    )
    expect(validateSkin(minimal({ minApp: '0.6.0' })).ok).toBe(true) // bez znalosti verze se nekontroluje
  })
})

describe('validateSkin: tokeny', () => {
  it('uloží ořezané platné hodnoty', () => {
    const r = validateSkin(
      minimal({ tokens: { '--drd-accent': '  #7a3b00 ', '--drd-radius': '4px' } }),
    )
    expect(r.ok).toBe(true)
    expect(r.skin?.tokens).toEqual({ '--drd-accent': '#7a3b00', '--drd-radius': '4px' })
  })

  it('neplatná hodnota je chyba s cestou, neznámý token jen varování', () => {
    const r = validateSkin(
      minimal({ tokens: { '--drd-bg': 'url(x)', '--drd-nic': '1', '--drd-gap': '1rem' } }),
    )
    expect(r.ok).toBe(false)
    expect(r.skin).toBeNull()
    expect(r.issues).toContainEqual(
      expect.objectContaining({ level: 'error', path: 'tokens.--drd-bg' }),
    )
    expect(r.issues).toContainEqual(
      expect.objectContaining({ level: 'warning', path: 'tokens.--drd-nic' }),
    )
  })

  it('nenechá se napadnout přes __proto__ ani constructor', () => {
    const raw = JSON.parse(
      '{"schema":1,"id":"a","name":"a","version":"1.0.0","author":"a","license":"a","scheme":"dark","tokens":{"__proto__":{"x":"1"},"constructor":"1"}}',
    )
    const r = validateSkin(raw)
    expect(r.ok).toBe(true)
    expect(Object.keys(r.skin!.tokens)).toEqual([])
    expect(({} as Record<string, unknown>).x).toBeUndefined()
  })

  it('tokens musí být objekt', () => {
    expect(errors(minimal({ tokens: [] }))[0]).toMatchObject({ path: 'tokens' })
    expect(errors(minimal({ tokens: 'x' }))[0]).toMatchObject({ path: 'tokens' })
  })
})

describe('validateSkin: varianty', () => {
  const variant = (when: unknown, tokens: unknown = { '--drd-gap': '0.5rem' }) => ({
    variants: [{ when, tokens }],
  })

  it('přijme platnou variantu', () => {
    const r = validateSkin(
      minimal(variant({ width: 'compact', orientation: 'landscape', low: true })),
    )
    expect(r.ok).toBe(true)
    expect(r.skin?.variants).toEqual([
      {
        when: { width: 'compact', orientation: 'landscape', low: true },
        tokens: { '--drd-gap': '0.5rem' },
      },
    ])
  })

  it.each([
    [{}],
    [undefined],
    [{ width: 'huge' }],
    [{ orientation: 'diagonal' }],
    [{ low: 'yes' }],
  ])('odmítne podmínku %j', (when) => {
    expect(errors(minimal(variant(when))).length).toBeGreaterThan(0)
  })

  it('neznámá podmínka varuje (a prázdná zbytek je chyba)', () => {
    const r = validateSkin(minimal(variant({ width: 'compact', theme: 'x' })))
    expect(r.ok).toBe(true)
    expect(r.issues).toContainEqual(
      expect.objectContaining({ level: 'warning', path: 'variants[0].when.theme' }),
    )
  })

  it('chyba tokenu ve variantě má cestu variants[i].tokens', () => {
    expect(
      errors(minimal(variant({ width: 'compact' }, { '--drd-gap': '99rem' })))[0],
    ).toMatchObject({ path: 'variants[0].tokens.--drd-gap' })
  })

  it('limit počtu variant', () => {
    const many = Array.from({ length: MAX_VARIANTS + 1 }, () => ({
      when: { width: 'compact' },
      tokens: {},
    }))
    expect(errors(minimal({ variants: many })).some((i) => i.path === 'variants')).toBe(true)
  })

  it('variants musí být pole', () => {
    expect(errors(minimal({ variants: {} }))[0]).toMatchObject({ path: 'variants' })
  })
})

describe('resolveTokens a skinTheme', () => {
  const skin = validateSkin(
    minimal({
      scheme: 'dark',
      tokens: { '--drd-accent': '#ff9900' },
      variants: [
        { when: { width: 'compact' }, tokens: { '--drd-gap': '0.5rem' } },
        {
          when: { width: 'compact', orientation: 'landscape' },
          tokens: { '--drd-gap': '0.25rem', '--drd-radius': '2px' },
        },
        { when: { width: 'expanded' }, tokens: { '--drd-gap': '1.5rem' } },
      ],
    }),
  ).skin!

  it('základ je výchozí skin schématu přepsaný tokeny Hávu', () => {
    const t = resolveTokens(skin, classifyViewport(1200, 800))
    expect(t['--drd-bg']).toBe(darkTheme.tokens['--drd-bg'])
    expect(t['--drd-accent']).toBe('#ff9900')
  })

  it('odpovídající varianty se aplikují v pořadí, pozdější přepíše dřívější', () => {
    expect(resolveTokens(skin, classifyViewport(360, 800))['--drd-gap']).toBe('0.5rem')
    const land = resolveTokens(skin, classifyViewport(700, 360)) // medium: žádná varianta
    expect(land['--drd-gap']).toBe(darkTheme.tokens['--drd-gap'])
    const phoneLand = resolveTokens(skin, { width: 'compact', orientation: 'landscape', low: true })
    expect(phoneLand['--drd-gap']).toBe('0.25rem')
    expect(phoneLand['--drd-radius']).toBe('2px')
    expect(resolveTokens(skin, classifyViewport(1200, 800))['--drd-gap']).toBe('1.5rem')
  })

  it('nemění výchozí skin ani Háv (čistá funkce)', () => {
    resolveTokens(skin, classifyViewport(360, 800))
    expect(darkTheme.tokens['--drd-gap']).toBe('1rem')
    expect(skin.tokens).toEqual({ '--drd-accent': '#ff9900' })
  })

  it('skinTheme dá id, název a schéma Hávu', () => {
    expect(skinTheme(skin, classifyViewport(360, 800))).toMatchObject({
      id: 'svitek',
      name: 'Pergamen',
      scheme: 'dark',
    })
  })
})

describe('kontrast', () => {
  it('pod 3:1 je chyba a Háv se nevrátí', () => {
    const r = validateSkin(minimal({ tokens: { '--drd-text': '#f0e8d8' } })) // téměř bílý text na světlém pozadí
    expect(r.ok).toBe(false)
    expect(r.skin).toBeNull()
    expect(r.issues).toContainEqual(
      expect.objectContaining({ level: 'error', path: 'tokens.--drd-text' }),
    )
  })

  it('mezi 3:1 a 4,5:1 je jen varování', () => {
    // světle šedý tlumený text na bílé ploše: kontrast ~3,5:1
    const r = validateSkin(minimal({ tokens: { '--drd-text-muted': '#888888' } }))
    const w = r.issues.filter((i) => i.path === 'tokens.--drd-text-muted')
    expect(w.length).toBeGreaterThan(0)
    expect(w.every((i) => i.level === 'warning')).toBe(true)
    expect(r.ok).toBe(true)
  })

  it('bez variant zpráva neuvádí viewport, s variantami ano', () => {
    const plain = validateSkin(minimal({ tokens: { '--drd-text-muted': '#858585' } }))
    expect(plain.issues.length).toBeGreaterThan(0)
    expect(plain.issues.every((i) => !i.message.includes('úzký'))).toBe(true)
    const varied = validateSkin(
      minimal({
        tokens: { '--drd-text-muted': '#858585' },
        variants: [{ when: { width: 'compact' }, tokens: { '--drd-gap': '0.5rem' } }],
      }),
    )
    expect(varied.issues.some((i) => i.message.includes('('))).toBe(true)
  })

  it('kontroluje i varianty (špatný kontrast jen na úzkém viewportu)', () => {
    const r = validateSkin(
      minimal({
        variants: [
          {
            when: { width: 'compact' },
            tokens: { '--drd-bg': '#fdfbf5', '--drd-text': '#f6f1e6' },
          },
        ],
      }),
    )
    expect(r.ok).toBe(false)
    expect(r.issues.some((i) => i.level === 'error' && i.message.includes('úzký'))).toBe(true)
  })

  it('stejnou chybu z více viewportů hlásí jednou', () => {
    const r = validateSkin(minimal({ tokens: { '--drd-text': '#f0e8d8' } }))
    const keys = r.issues.map((i) => i.message)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
