import { describe, expect, it } from 'vitest'
import { darkTheme, lightTheme } from '../../themes/default'
import { isTokenName, tokenValueError, TOKEN_NAMES, TOKEN_SPECS, type TokenName } from './tokens'

const ok = (name: TokenName, value: string) => expect(tokenValueError(name, value)).toBeNull()
const bad = (name: TokenName, value: unknown) =>
  expect(tokenValueError(name, value)).toEqual(expect.any(String))

describe('sada tokenů', () => {
  it('odpovídá výchozím skinům (každý token má specifikaci i hodnotu)', () => {
    expect(Object.keys(TOKEN_SPECS).sort()).toEqual([...TOKEN_NAMES].sort())
    expect(Object.keys(darkTheme.tokens).sort()).toEqual([...TOKEN_NAMES].sort())
    expect(Object.keys(lightTheme.tokens).sort()).toEqual([...TOKEN_NAMES].sort())
  })

  it('všechny hodnoty výchozích skinů projdou validací', () => {
    for (const theme of [darkTheme, lightTheme]) {
      for (const name of TOKEN_NAMES) expect(tokenValueError(name, theme.tokens[name])).toBeNull()
    }
  })

  it('isTokenName neprojde na prototypové klíče', () => {
    expect(isTokenName('--drd-bg')).toBe(true)
    expect(isTokenName('--drd-unknown')).toBe(false)
    expect(isTokenName('__proto__')).toBe(false)
    expect(isTokenName('constructor')).toBe(false)
    expect(isTokenName('toString')).toBe(false)
  })
})

describe('barvy', () => {
  it('plochy musí být neprůhledné, zástěna ne', () => {
    ok('--drd-bg', '#112233')
    bad('--drd-bg', 'rgb(0 0 0 / 0.5)')
    ok('--drd-scrim', 'rgb(0 0 0 / 0.5)')
    bad('--drd-bg', 'red')
  })
})

describe('délky', () => {
  it('přijímá px, rem, em v mezích', () => {
    ok('--drd-radius', '10px')
    ok('--drd-radius', '0')
    ok('--drd-radius', '0.5rem')
    ok('--drd-gap', '1rem')
  })
  it('odmítne meze, bezrozměrná čísla a procenta', () => {
    bad('--drd-radius', '49px')
    bad('--drd-radius', '-1px')
    bad('--drd-gap', '0')
    bad('--drd-gap', '3rem')
    bad('--drd-gap', '10')
    bad('--drd-gap', '10%')
    bad('--drd-radius', 'calc(1px + 1px)')
  })
})

describe('písma', () => {
  it('přijímá systémová písma s obecnou rodinou na konci', () => {
    ok('--drd-font', "system-ui, 'Segoe UI', Roboto, sans-serif")
    ok('--drd-font', 'Georgia, serif')
    ok('--drd-font', '"Palatino Linotype", serif')
  })
  it('odmítne chybějící obecnou rodinu, nebezpečné znaky a nezabalené víceslovné názvy', () => {
    bad('--drd-font', 'Roboto')
    bad('--drd-font', 'Segoe UI, sans-serif')
    bad('--drd-font', 'serif; background: url(x)')
    bad('--drd-font', "'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', serif")
    bad('--drd-font', 'sans-serif, url(//evil.example/f.woff)')
  })
})

describe('stíny', () => {
  it('přijímá none a běžné zápisy', () => {
    ok('--drd-shadow', 'none')
    ok('--drd-shadow', '0 2px 12px rgb(0 0 0 / 0.5)')
    ok('--drd-shadow', '#000 0 2px 4px, inset 0 0 8px 1px rgba(255, 255, 255, 0.2)')
  })
  it('odmítne chybějící barvu, nesmysly a obří rozměry', () => {
    bad('--drd-shadow', '0 2px 12px')
    bad('--drd-shadow', '0 2px 12px red')
    bad('--drd-shadow', '0 2px 100px #000')
    bad('--drd-shadow', '0 2px -4px #000')
    bad('--drd-shadow', '0 #000')
    bad('--drd-shadow', '0 1px 1px #000, 0 1px 1px #000, 0 1px 1px #000, 0 1px 1px #000')
  })
})

describe('stín textu (embos)', () => {
  it('přijímá none, tvrdý stín i embos z dvou vrstev', () => {
    ok('--drd-text-shadow', 'none')
    ok('--drd-text-shadow', '1px 1px 0 #000')
    ok('--drd-text-shadow', '-1px -1px 0 rgb(0 0 0 / 0.7), 1px 1px 0 rgb(255 255 255 / 0.12)')
    ok('--drd-text-shadow', '0 1px 2px rgba(0, 0, 0, 0.5)')
  })
  it('na rozdíl od stínu prvků nezná inset a rozšíření a vyžaduje barvu', () => {
    bad('--drd-text-shadow', 'inset 1px 1px 0 #000')
    bad('--drd-text-shadow', '1px 1px 2px 3px #000') // rozšíření
    bad('--drd-text-shadow', '1px 1px 0')
    bad('--drd-text-shadow', '1px 1px 100px #000')
    bad('--drd-text-shadow', '1px 1px -2px #000')
    bad('--drd-text-shadow', '1px 1px 0 #000, 1px 1px 0 #000, 1px 1px 0 #000, 1px 1px 0 #000')
  })
})

describe('nebezpečné vstupy', () => {
  it.each([
    'url(https://evil.example/x.png)',
    'var(--drd-bg)',
    '#fff; } body { display: none',
    '#fff /* x */',
    'expression(1)',
    '#fff\\',
    '#f\nff',
    '<b>',
  ])('odmítne %j u každého typu tokenu', (value) => {
    for (const name of TOKEN_NAMES) bad(name, value)
  })
  it('odmítne netextové hodnoty a příliš dlouhé texty', () => {
    bad('--drd-bg', 123)
    bad('--drd-bg', null)
    bad('--drd-bg', '')
    bad('--drd-font', 'a'.repeat(201))
  })
})

describe('poloha lišty (--drd-nav-position)', () => {
  it('povoluje jen bottom, top, left a right', () => {
    for (const v of ['bottom', 'top', 'left', 'right'])
      expect(tokenValueError('--drd-nav-position', v)).toBeNull()
    for (const v of ['center', 'LEFT', '10px', '', 'left; color: red'])
      expect(tokenValueError('--drd-nav-position', v)).not.toBeNull()
  })
})
