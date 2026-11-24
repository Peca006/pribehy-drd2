import { describe, expect, it } from 'vitest'
import { addIncident, addNode, setStage } from './deck'
import { ANYTIME, emptyExpedition, emptyRun, type Expedition } from './model'
import {
  addExtra,
  currentStage,
  deploy,
  finish,
  nextNode,
  pace,
  playDecks,
  postpone,
  promoteExtra,
  reachNode,
  removeExtra,
  reset,
  stateOf,
  unreachNode,
} from './run'

/** Výprava: uzly Zvrat, Odpočinek (kind), Finále; příhody A,B na začátku, C po Zvratu, D po Odpočinku, K kdykoli. */
function fixture() {
  let e: Expedition = emptyExpedition('Cesta')
  e = addNode(e, 'Zvrat')
  e = addNode(e, 'Pauza')
  e = addNode(e, 'Finále')
  e = { ...e, nodes: e.nodes.map((n) => (n.title === 'Pauza' ? { ...n, kind: 'odpocinek' as const } : n)) }
  const ids: Record<string, string> = {}
  for (const [t, stage] of [
    ['A', ''],
    ['B', ''],
    ['C', e.nodes[0].id],
    ['D', e.nodes[1].id],
    ['K', ANYTIME],
  ] as const) {
    const r = addIncident(e, stage)
    ids[t] = r.incident.id
    e = { ...r.expedition, incidents: r.expedition.incidents.map((i) => (i.id === r.incident.id ? { ...i, title: t } : i)) }
  }
  return { e, ids, run: emptyRun('Vlci – Cesta', 'p1', e.id) }
}

describe('vedení výpravy', () => {
  it('příhoda bez záznamu je připravená; nasadit, odehrát, odložit a vrátit', () => {
    const { ids, run } = fixture()
    expect(stateOf(run, ids.A)).toBe('priprava')
    let r = deploy(run, ids.A)
    expect(stateOf(r, ids.A)).toBe('nasazena')
    r = finish(r, ids.A, 'neuspech', '  Utekli  ')
    expect(r.incidents[ids.A]).toEqual({ state: 'odehrana', outcome: 'neuspech', result: 'Utekli' })
    r = postpone(r, ids.B)
    expect(stateOf(r, ids.B)).toBe('odlozena')
    r = reset(r, ids.A)
    expect(stateOf(r, ids.A)).toBe('priprava')
    expect(run.incidents).toEqual({})
  })

  it('aktuální balíček je po naposledy dosaženém uzlu a uzly se dají vrátit', () => {
    const { e, run } = fixture()
    expect(currentStage(e, run)).toBe('')
    expect(nextNode(e, run)?.title).toBe('Zvrat')
    let r = reachNode(run, e.nodes[0].id)
    expect(currentStage(e, r)).toBe(e.nodes[0].id)
    expect(nextNode(e, r)?.title).toBe('Pauza')
    expect(reachNode(r, e.nodes[0].id)).toBe(r)
    r = unreachNode(r, e.nodes[0].id)
    expect(currentStage(e, r)).toBe('')
    expect(currentStage(e, { ...run, reachedNodes: ['smazany'] })).toBe('')
  })

  it('balíčky pro hru označí aktuální a počítají neodehrané', () => {
    const { e, ids, run } = fixture()
    let r = finish(run, ids.A, 'uspech', '')
    const d = playDecks(e, r)
    expect(d.map((x) => [x.key === '' ? 'start' : x.key === ANYTIME ? 'any' : 'n', x.open, x.current])).toEqual([
      ['start', 1, true],
      ['n', 1, false],
      ['n', 1, false],
      ['n', 0, false],
      ['any', 1, false],
    ])
    r = reachNode(r, e.nodes[0].id)
    expect(playDecks(e, r).filter((x) => x.current).map((x) => x.key)).toEqual([e.nodes[0].id])
  })

  it('tempo: příhody do dalšího uzlu a do příležitosti k odpočinku', () => {
    const { e, ids, run } = fixture()
    // na začátku: A,B před Zvratem; A,B,C před Pauzou (odpočinek); kdykoli 1
    let p = pace(e, run)
    expect(p.next).toEqual({ title: 'Zvrat', incidents: 2 })
    expect(p.rest).toEqual({ title: 'Pauza', incidents: 3 })
    expect(p.openAnytime).toBe(1)
    expect(p.total).toBe(5)
    let r = finish(finish(run, ids.A, 'uspech', ''), ids.B, 'jinak', '')
    p = pace(e, r)
    expect(p.next?.incidents).toBe(0)
    expect(p.rest?.incidents).toBe(1)
    expect(p.played).toBe(2)
    r = reachNode(reachNode(r, e.nodes[0].id), e.nodes[1].id)
    p = pace(e, r)
    expect(p.next).toEqual({ title: 'Finále', incidents: 1 })
    expect(p.rest).toBeUndefined()
    expect(pace(e, reachNode(r, e.nodes[2].id)).next).toBeUndefined()
  })

  it('vymyšlená příhoda patří do aktuálního balíčku vedení, jde uložit do přípravy nebo smazat', () => {
    const { e, run } = fixture()
    const added = addExtra(e, reachNode(run, e.nodes[0].id), '  Bouře  ')
    expect(added.incident.title).toBe('Bouře')
    expect(added.incident.stage).toBe(e.nodes[0].id)
    expect(playDecks(e, added.run).at(-1)).toMatchObject({ key: 'extra', open: 1 })
    expect(e.incidents).toHaveLength(5)

    const played = finish(added.run, added.incident.id, 'uspech', 'ok')
    const promoted = promoteExtra(e, played, added.incident.id)
    expect(promoted.expedition.incidents.map((i) => i.title)).toContain('Bouře')
    expect(promoted.run.extra).toHaveLength(0)
    expect(stateOf(promoted.run, added.incident.id)).toBe('odehrana')

    const gone = removeExtra(played, added.incident.id)
    expect(gone.extra).toHaveLength(0)
    expect(gone.incidents[added.incident.id]).toBeUndefined()
    expect(promoteExtra(e, run, 'nic').expedition).toBe(e)
  })

  it('přesun příhody v přípravě se ve vedení projeví bez ztráty stavu', () => {
    const { e, ids, run } = fixture()
    const r = finish(run, ids.A, 'uspech', 'x')
    const moved = setStage(e, ids.A, ANYTIME)
    expect(playDecks(moved, r).find((d) => d.key === ANYTIME)!.items.map((i) => [i.incident.title, i.state])).toEqual([
      ['K', 'priprava'],
      ['A', 'odehrana'],
    ])
  })
})
