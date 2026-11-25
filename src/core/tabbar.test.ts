import { describe, expect, it } from 'vitest'
import {
  defaultTabbar,
  isDefaultTabbar,
  layoutTabs,
  moveTab,
  orderedIds,
  parseTabbar,
  placementOf,
  setPlacement,
} from './tabbar'

const mods = ['postavy', 'druziny', 'ctenar', 'bestiar', 'grimoar', 'knihovna'].map((id) => ({ id }))
const all = mods.map((m) => m.id)
const names = (l: { id: string }[]) => l.map((m) => m.id)

describe('layoutTabs', () => {
  it('výchozí: Postava vlevo, Více vpravo, ostatní se posouvají v původním pořadí', () => {
    const l = layoutTabs(mods, defaultTabbar())
    expect(l.left?.id).toBe('postavy')
    expect(l.right?.id).toBe('knihovna')
    expect(names(l.middle)).toEqual(['druziny', 'ctenar', 'bestiar', 'grimoar'])
  })

  it('pořadí z nastavení má přednost, nové moduly se přidají na konec', () => {
    const cfg = { ...defaultTabbar(), order: ['grimoar', 'druziny', 'neznamy'] }
    expect(names(layoutTabs(mods, cfg).middle)).toEqual(['grimoar', 'druziny', 'ctenar', 'bestiar'])
  })

  it('skrytá záložka v liště není a přišpendlená skrytá se uvolní', () => {
    const cfg = { order: [], hidden: ['postavy', 'bestiar'], left: 'postavy', right: 'knihovna' }
    const l = layoutTabs(mods, cfg)
    expect(l.left).toBeNull()
    expect(names(l.middle)).toEqual(['druziny', 'ctenar', 'grimoar'])
  })

  it('přišpendlení může chybět a neexistující modul se ignoruje', () => {
    const l = layoutTabs(mods, { order: [], hidden: [], left: '', right: 'neni' })
    expect(l.left).toBeNull()
    expect(l.right).toBeNull()
    expect(l.middle).toHaveLength(6)
  })
})

describe('parseTabbar', () => {
  it('nesmysl dá výchozí hodnoty', () => {
    expect(parseTabbar(null)).toEqual(defaultTabbar())
    expect(parseTabbar('x')).toEqual(defaultTabbar())
    expect(parseTabbar({ order: 5, hidden: { a: 1 }, left: 7 })).toEqual(defaultTabbar())
  })

  it('zahodí neplatná id, duplicity a skrytí Více; prázdné přišpendlení platí', () => {
    const c = parseTabbar({
      order: ['a', 'a', 'B C', 'b'],
      hidden: ['knihovna', 'x'],
      left: '',
      right: 'y',
    })
    expect(c.order).toEqual(['a', 'b'])
    expect(c.hidden).toEqual(['x'])
    expect(c.left).toBe('')
    expect(c.right).toBe('y')
  })

  it('stejná záložka na obou stranách zůstane jen vlevo', () => {
    const c = parseTabbar({ left: 'a', right: 'a' })
    expect(c.left).toBe('a')
    expect(c.right).toBe('')
  })
})

describe('setPlacement', () => {
  it('obsazenou stranu uvolní předchozí záložce', () => {
    const c = setPlacement(defaultTabbar(), 'grimoar', 'left')
    expect(c.left).toBe('grimoar')
    expect(placementOf(c, 'postavy')).toBe('scroll')
  })

  it('přesun na druhou stranu uvolní původní', () => {
    const c = setPlacement(defaultTabbar(), 'postavy', 'right')
    expect(c.right).toBe('postavy')
    expect(c.left).toBe('')
    expect(placementOf(c, 'knihovna')).toBe('scroll')
  })

  it('skrytí přišpendlené záložky ji uvolní a Více nejde skrýt', () => {
    const c = setPlacement(defaultTabbar(), 'postavy', 'hidden')
    expect(c.left).toBe('')
    expect(placementOf(c, 'postavy')).toBe('hidden')
    expect(setPlacement(c, 'knihovna', 'hidden')).toBe(c)
  })

  it('zobrazení skryté záložky ji vrátí do posuvné části', () => {
    const c = setPlacement(setPlacement(defaultTabbar(), 'bestiar', 'hidden'), 'bestiar', 'scroll')
    expect(placementOf(c, 'bestiar')).toBe('scroll')
  })
})

describe('moveTab', () => {
  it('posune o místo a uloží celé pořadí', () => {
    const c = moveTab(defaultTabbar(), all, 'bestiar', -1)
    expect(c.order).toEqual(['postavy', 'druziny', 'bestiar', 'ctenar', 'grimoar', 'knihovna'])
  })

  it('na okraji nic nezmění', () => {
    const c = defaultTabbar()
    expect(moveTab(c, all, 'postavy', -1)).toBe(c)
    expect(moveTab(c, all, 'knihovna', 1)).toBe(c)
  })

  it('orderedIds drží nastavené pořadí', () => {
    expect(orderedIds(all, { ...defaultTabbar(), order: ['knihovna', 'postavy'] }).slice(0, 3)).toEqual([
      'knihovna',
      'postavy',
      'druziny',
    ])
  })

  it('výchozí nastavení se pozná', () => {
    expect(isDefaultTabbar(defaultTabbar())).toBe(true)
    expect(isDefaultTabbar(moveTab(defaultTabbar(), all, 'bestiar', -1))).toBe(false)
  })
})
