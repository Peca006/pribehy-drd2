import { describe, expect, it } from 'vitest'
import { BUILTIN_SKINS } from '../../themes/havy'
import {
  EDITABLE_TOKENS,
  FONT_PRESETS,
  TOKEN_GROUPS,
  blankSkin,
  copyForEditing,
  fieldKind,
  enumValues,
  fieldRange,
  hexOf,
  newSkinId,
  setMeta,
  setScheme,
  setToken,
  slugify,
  tokenValue,
} from './editor'
import { validateSkin } from './skin'
import { TOKEN_NAMES, tokenValueError } from './tokens'

describe('název a id', () => {
  it('slugify zbaví diakritiky a ořízne okraje', () => {
    expect(slugify('  Můj Šatník – červený!  ')).toBe('muj-satnik-cerveny')
    expect(slugify('!!!')).toBe('')
  })
  it('newSkinId nikdy nezastíní vestavěný ani existující Háv a vejde se do 40 znaků', () => {
    expect(newSkinId('Podzemí', [])).toBe('moje-podzemi')
    expect(newSkinId('Podzemí', ['moje-podzemi'])).toBe('moje-podzemi-2')
    expect(newSkinId('', [])).toBe('moje-hav')
    expect(newSkinId('Moje jeskyně', [])).toBe('moje-jeskyne')
    const long = newSkinId('a'.repeat(100), [])
    expect(long.length).toBeLessThanOrEqual(40)
    expect(validateSkin({ ...blankSkin('dark'), id: long }).ok).toBe(true)
  })
})

describe('kopie pro úpravy', () => {
  it('z vestavěného Hávu vznikne platný Háv s novým id a zachovanými obrázky a rolemi', () => {
    const podzemi = BUILTIN_SKINS.find((s) => s.id === 'podzemi')!
    const copy = copyForEditing(podzemi, { name: 'Moje jeskyně', author: 'Petr', taken: [] })
    expect(copy.id).toBe('moje-jeskyne')
    expect(copy.version).toBe('1.0.0')
    expect(copy.assets).toEqual(podzemi.assets)
    expect(copy.roles).toEqual(podzemi.roles)
    expect(validateSkin(copy).ok).toBe(true)
    // zdroj se nezměnil
    expect(podzemi.id).toBe('podzemi')
  })
})

describe('úprava tokenů', () => {
  const base = blankSkin('dark')

  it('platná hodnota se uloží, nesmyslná se odmítne a Háv zůstane', () => {
    const ok = setToken(base, '--drd-accent', '#ff8800')
    expect(ok.error).toBeNull()
    expect(ok.skin.tokens['--drd-accent']).toBe('#ff8800')
    const bad = setToken(ok.skin, '--drd-accent', 'url(x)')
    expect(bad.error).not.toBeNull()
    expect(bad.skin).toBe(ok.skin)
    // průhledná barva tam, kde se vyžaduje neprůhledná
    expect(setToken(base, '--drd-bg', '#00000080').error).not.toBeNull()
  })

  it('prázdná hodnota a shoda s výchozí hodnotou token odstraní', () => {
    const a = setToken(base, '--drd-accent', '#ff8800').skin
    expect(setToken(a, '--drd-accent', '').skin.tokens).toEqual({})
    const def = tokenValue(base, '--drd-accent')
    expect(setToken(a, '--drd-accent', def).skin.tokens).toEqual({})
  })

  it('tokenValue bere výchozí hodnotu podle schématu', () => {
    const light = setScheme(base, 'light')
    expect(tokenValue(light, '--drd-bg')).not.toBe(tokenValue(base, '--drd-bg'))
    expect(tokenValue(setToken(base, '--drd-bg', '#101010').skin, '--drd-bg')).toBe('#101010')
  })

  it('každá nabízená písmena a hodnoty projdou validací', () => {
    for (const f of FONT_PRESETS) expect(tokenValueError('--drd-font', f.value), f.label).toBeNull()
  })

  it('vystavené tokeny jsou známé a každý token je v editoru právě jednou', () => {
    expect(new Set(EDITABLE_TOKENS).size).toBe(EDITABLE_TOKENS.length)
    expect([...EDITABLE_TOKENS].sort()).toEqual([...TOKEN_NAMES].sort())
    expect(TOKEN_GROUPS.every((g) => g.fields.length > 0)).toBe(true)
  })

  it('ovládací prvek odpovídá druhu tokenu', () => {
    expect(fieldKind('--drd-bg')).toBe('color')
    expect(fieldKind('--drd-scrim')).toBe('color-text')
    expect(fieldKind('--drd-font')).toBe('font')
    expect(fieldKind('--drd-shadow')).toBe('text')
    expect(fieldKind('--drd-radius')).toBe('px')
    expect(fieldKind('--drd-panel-opacity')).toBe('percent')
    expect(fieldKind('--drd-shape-panel')).toBe('enum')
  })

  it('výsledný Háv po libovolné platné úpravě projde validací', () => {
    let s = copyForEditing(BUILTIN_SKINS.find((x) => x.id === 'podzemi')!, { name: 'Zkouška', author: 'T', taken: [] })
    for (const [n, v] of [
      ['--drd-bg', '#102030'],
      ['--drd-radius', '12px'],
      ['--drd-shape-button', 'chamfer'],
      ['--drd-panel-opacity', '70%'],
      ['--drd-nav-position', 'left'],
      ['--drd-font', FONT_PRESETS[1]!.value],
    ] as const)
      s = setToken(s, n, v).skin
    expect(validateSkin(s).issues.filter((i) => i.level === 'error')).toEqual([])
  })
})

describe('metadata', () => {
  it('setMeta ořízne na meze a prázdné hodnoty ignoruje', () => {
    const s = setMeta(blankSkin('dark'), { name: 'x'.repeat(100), author: '  ', license: 'CC0' })
    expect(s.name).toHaveLength(60)
    expect(s.author).toBe('neznámý autor')
    expect(s.license).toBe('CC0')
  })
  it('hexOf vrací jen neprůhledné barvy', () => {
    expect(hexOf('#abc')).toBe('#aabbcc')
    expect(hexOf('rgb(255 0 0 / 0.5)')).toBeNull()
    expect(hexOf('nesmysl')).toBeNull()
  })
})

describe('kontrast hlídá validace', () => {
  it('světlý text na tmavém pozadí po změně na světlé pozadí Háv zablokuje', () => {
    const s = setToken(blankSkin('dark'), '--drd-bg', '#f5f5f5').skin
    const v = validateSkin(s)
    expect(v.ok).toBe(false)
    expect(v.issues.some((i) => i.level === 'error' && /kontrast/.test(i.message))).toBe(true)
  })
})

describe('meze a výčty', () => {
  it('fieldRange a enumValues vycházejí ze specifikace tokenů', () => {
    expect(fieldRange('--drd-radius')).toEqual({ min: 0, max: 48 })
    expect(fieldRange('--drd-panel-opacity')).toEqual({ min: 60, max: 100 })
    expect(fieldRange('--drd-bg')).toBeNull()
    expect(enumValues('--drd-nav-position')).toEqual(['bottom', 'top', 'left', 'right'])
    expect(enumValues('--drd-bg')).toEqual([])
  })
})
