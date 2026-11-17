import { describe, expect, it } from 'vitest'
import {
  emptyNav,
  getScroll,
  lastHash,
  MAX_SCROLL_ENTRIES,
  moduleOf,
  parseNav,
  remember,
  setScroll,
} from './nav'

describe('paměť navigace', () => {
  it('modul z adresy', () => {
    expect(moduleOf('#/postavy/demo-eliska')).toBe('postavy')
    expect(moduleOf('#/ctenar')).toBe('ctenar')
    expect(moduleOf('#/')).toBe('')
    expect(moduleOf('')).toBe('')
  })

  it('záložka vede na poslední adresu modulu, jinak na kořen', () => {
    const s = emptyNav()
    expect(lastHash(s, 'postavy')).toBe('#/postavy')
    remember(s, '#/postavy/demo-eliska')
    remember(s, '#/ctenar/31-zakladni-pravidla/presne')
    remember(s, '#/')
    expect(lastHash(s, 'postavy')).toBe('#/postavy/demo-eliska')
    expect(lastHash(s, 'ctenar')).toBe('#/ctenar/31-zakladni-pravidla/presne')
    expect(Object.keys(s.routes)).toEqual(['postavy', 'ctenar'])
  })

  it('posun se pamatuje po adrese, nula se zahodí a počet je omezený od nejstarších', () => {
    const s = emptyNav()
    setScroll(s, '#/a', 300)
    expect(getScroll(s, '#/a')).toBe(300)
    setScroll(s, '#/a', 0)
    expect(getScroll(s, '#/a')).toBe(0)
    for (let i = 0; i < MAX_SCROLL_ENTRIES + 5; i++) setScroll(s, `#/x/${i}`, i + 1)
    expect(Object.keys(s.scroll)).toHaveLength(MAX_SCROLL_ENTRIES)
    expect(getScroll(s, '#/x/0')).toBe(0)
    expect(getScroll(s, `#/x/${MAX_SCROLL_ENTRIES + 4}`)).toBe(MAX_SCROLL_ENTRIES + 5)
  })

  it('poškozený nebo cizí záznam se zahodí, správné položky zůstanou', () => {
    expect(parseNav('nesmysl')).toEqual(emptyNav())
    expect(parseNav(null)).toEqual(emptyNav())
    const s = parseNav(
      JSON.stringify({ routes: { a: '#/a/1', b: 5, c: 'x' }, scroll: { '#/a/1': 120.4, '#/b': -3, '#/c': 'x' } }),
    )
    expect(s).toEqual({ routes: { a: '#/a/1' }, scroll: { '#/a/1': 120 } })
  })
})
