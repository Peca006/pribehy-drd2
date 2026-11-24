import { describe, expect, it } from 'vitest'
import {
  addCast,
  addIncident,
  addNode,
  decks,
  moveIncident,
  moveNode,
  normalize,
  removeCast,
  removeIncident,
  removeNode,
  setStage,
  stageLabels,
} from './deck'
import { ANYTIME, emptyExpedition, type Expedition } from './model'

const base = (): Expedition => {
  let e = emptyExpedition('Cesta')
  e = addNode(e, 'Zvrat')
  e = addNode(e, 'Finále')
  return e
}
const titles = (e: Expedition, key: string) => decks(e).find((d) => d.key === key)!.incidents.map((i) => i.title)

function withIncidents(e: Expedition, defs: [string, string][]): Expedition {
  for (const [title, stage] of defs) {
    const r = addIncident(e, stage)
    e = { ...r.expedition, incidents: r.expedition.incidents.map((i) => (i.id === r.incident.id ? { ...i, title } : i)) }
  }
  return e
}

describe('balíčky příhod', () => {
  it('balíčky jdou v pořadí příběhu: začátek, po každém uzlu, kdykoli', () => {
    const e = base()
    expect(decks(e).map((d) => d.key)).toEqual(['', e.nodes[0].id, e.nodes[1].id, ANYTIME])
    expect(stageLabels(e).map((s) => s.label)).toEqual([
      'Na začátku (před prvním uzlovým bodem)',
      'Po uzlovém bodě: Zvrat',
      'Po uzlovém bodě: Finále',
      'Kdykoli',
    ])
  })

  it('uzel bez názvu dostane pořadové jméno', () => {
    const e = addNode(emptyExpedition('x'))
    expect(stageLabels(e)[1].label).toBe('Po uzlovém bodě: Uzlový bod 1')
  })

  it('příhody se řadí do balíčků podle stage, pořadí je pořadí v poli', () => {
    const e0 = base()
    const e = withIncidents(e0, [['A', ''], ['B', e0.nodes[0].id], ['C', ''], ['D', ANYTIME]])
    expect(titles(e, '')).toEqual(['A', 'C'])
    expect(titles(e, e0.nodes[0].id)).toEqual(['B'])
    expect(titles(e, ANYTIME)).toEqual(['D'])
  })

  it('posun příhody přeskočí příhody jiných balíčků a nepřeteče', () => {
    const e0 = base()
    let e = withIncidents(e0, [['A', ''], ['B', e0.nodes[0].id], ['C', '']])
    const a = e.incidents[0].id
    const c = e.incidents[2].id
    e = moveIncident(e, a, 1)
    expect(titles(e, '')).toEqual(['C', 'A'])
    expect(moveIncident(e, a, 1)).toBe(e)
    e = moveIncident(e, c, -1)
    expect(moveIncident(e, c, -1)).toBe(e)
  })

  it('přesun do jiného balíčku dá příhodu na jeho konec', () => {
    const e0 = base()
    let e = withIncidents(e0, [['A', ''], ['B', e0.nodes[0].id]])
    e = setStage(e, e.incidents[0].id, e0.nodes[0].id)
    expect(titles(e, e0.nodes[0].id)).toEqual(['B', 'A'])
    expect(titles(e, '')).toEqual([])
  })

  it('odebraný uzel přesune příhody do předchozího balíčku, první uzel na začátek', () => {
    const e0 = base()
    let e = withIncidents(e0, [['A', e0.nodes[0].id], ['B', e0.nodes[1].id]])
    e = removeNode(e, e0.nodes[1].id)
    expect(titles(e, e0.nodes[0].id)).toEqual(['A', 'B'])
    e = removeNode(e, e0.nodes[0].id)
    expect(titles(e, '')).toEqual(['A', 'B'])
  })

  it('posun uzlu změní pořadí balíčků a příhody zůstanou u svého uzlu', () => {
    const e0 = base()
    let e = withIncidents(e0, [['A', e0.nodes[0].id]])
    e = moveNode(e, e0.nodes[0].id, 1)
    expect(decks(e).map((d) => d.node?.title ?? d.key)).toEqual(['', 'Finále', 'Zvrat', ANYTIME])
    expect(titles(e, e0.nodes[0].id)).toEqual(['A'])
    expect(moveNode(e, e0.nodes[1].id, -1)).toBe(e)
  })

  it('příhoda s neznámým stupněm patří na začátek a normalize ji tam opraví', () => {
    const e0 = base()
    let e = withIncidents(e0, [['A', 'neznamy']])
    expect(titles(e, '')).toEqual(['A'])
    e = normalize(e)
    expect(e.incidents[0].stage).toBe('')
    expect(normalize(e)).toBe(e)
  })

  it('odebrání příhody a cizí postavy', () => {
    const e0 = base()
    let e = withIncidents(e0, [['A', '']])
    const id = e.incidents[0].id
    let i = addCast(e.incidents[0], '  Harald  ')
    i = addCast(i, 'Vlk', 'bestiar:vlk')
    expect(i.cast).toEqual([{ name: 'Harald' }, { name: 'Vlk', creatureId: 'bestiar:vlk' }])
    expect(addCast(i, '   ')).toBe(i)
    expect(removeCast(i, 0).cast.map((c) => c.name)).toEqual(['Vlk'])
    e = removeIncident(e, id)
    expect(e.incidents).toEqual([])
  })
})
