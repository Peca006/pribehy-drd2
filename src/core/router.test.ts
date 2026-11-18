// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { NAV_KEY } from './nav'
import { go, markRestore, parseHash, router, startRouter, tabHref, toHash } from './router.svelte'

describe('adresy', () => {
  it('toHash a parseHash jsou k sobě inverzní, i s diakritikou a lomítkem v parametru', () => {
    const h = toHash('postavy', 'Eliška/1', 'ž č')
    expect(parseHash(h)).toEqual({ module: 'postavy', params: ['Eliška/1', 'ž č'] })
    expect(parseHash('#/')).toEqual({ module: '', params: [] })
    expect(parseHash('')).toEqual({ module: '', params: [] })
    expect(parseHash('#/ctenar/')).toEqual({ module: 'ctenar', params: [] })
  })
})

describe('směrovač a paměť sekcí (jsdom)', () => {
  beforeEach(() => {
    window.scrollTo = () => {}
    localStorage.clear()
    location.hash = ''
  })

  it('go změní stav směrovače po hashchange', async () => {
    startRouter()
    go('bestiar', 'druh', 'x')
    await new Promise((r) => setTimeout(r, 20))
    expect(router.module).toBe('bestiar')
    expect(router.params).toEqual(['druh', 'x'])
  })

  it('záložka aktivní sekce vede na kořen, jiná na poslední otevřenou stránku', async () => {
    startRouter()
    go('ctenar', '35-pouzivani-dovednosti')
    await new Promise((r) => setTimeout(r, 20))
    go('bestiar')
    await new Promise((r) => setTimeout(r, 20))
    expect(tabHref('bestiar', 'bestiar')).toBe('#/bestiar')
    expect(tabHref('ctenar', 'bestiar')).toBe('#/ctenar/35-pouzivani-dovednosti')
  })

  it('paměť navigace se ukládá do localStorage', async () => {
    startRouter()
    go('postavy', 'a')
    await new Promise((r) => setTimeout(r, 20))
    expect(localStorage.getItem(NAV_KEY)).toContain('postavy')
  })

  it('poškozená uložená paměť se ignoruje', () => {
    localStorage.setItem(NAV_KEY, '{nesmysl')
    expect(() => startRouter()).not.toThrow()
  })

  it('markRestore nepadá ani při opakovaném volání', () => {
    markRestore()
    markRestore()
  })
})
