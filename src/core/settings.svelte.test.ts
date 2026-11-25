// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Výchozí vzhled je Háv „Podzemí“; jednorázově se zapne všem, potom se volba uživatele respektuje.
async function load() {
  vi.resetModules()
  return (await import('./settings.svelte')).settings
}
const store = (o: object) => localStorage.setItem('drd2-settings', JSON.stringify(o))
const stored = () => JSON.parse(localStorage.getItem('drd2-settings') ?? '{}')

describe('výchozí vzhled', () => {
  beforeEach(() => localStorage.clear())

  it('bez uložené volby je Podzemí a značka úvodu se uloží hned', async () => {
    expect((await load()).skin).toBe('podzemi')
    expect(stored().skinIntro).toBe(1)
  })

  it('dřívější volba bez značky (i „Podle systému“) se jednorázově přepíše na Podzemí', async () => {
    store({ skin: 'system', author: 'Eda' })
    const s = await load()
    expect(s.skin).toBe('podzemi')
    expect(s.author).toBe('Eda')
    expect(stored().skin).toBe('podzemi')
  })

  it('po úvodu se uložená volba respektuje', async () => {
    store({ skin: 'system', skinIntro: 1 })
    expect((await load()).skin).toBe('system')
    store({ skin: 'noc', skinIntro: 1 })
    expect((await load()).skin).toBe('noc')
  })

  it('poškozená hodnota dá výchozí vzhled', async () => {
    store({ skin: 'Neplatné id!', skinIntro: 1 })
    expect((await load()).skin).toBe('podzemi')
  })
})

describe('výchozí spodní lišta', () => {
  beforeEach(() => localStorage.clear())
  const legacy = { order: [], hidden: [], left: 'postavy', right: 'knihovna' }

  it('bez uloženého nastavení má Příručku, Bestiář a Grimoár jen ve Sluji', async () => {
    expect((await load()).tabbar.hidden).toEqual(['ctenar', 'bestiar', 'grimoar'])
    expect(stored().tabbarIntro).toBe(1)
  })

  it('nedotčená dřívější lišta se přepne na novou výchozí', async () => {
    store({ skinIntro: 1, tabbar: legacy })
    expect((await load()).tabbar.hidden).toEqual(['ctenar', 'bestiar', 'grimoar'])
  })

  it('upravená lišta zůstane a po úvodu se i prázdné skrývání respektuje', async () => {
    const mine = { order: ['grimoar'], hidden: [], left: 'postavy', right: 'knihovna' }
    store({ skinIntro: 1, tabbar: mine })
    expect((await load()).tabbar).toEqual(mine)
    store({ skinIntro: 1, tabbarIntro: 1, tabbar: legacy })
    expect((await load()).tabbar.hidden).toEqual([])
  })
})
