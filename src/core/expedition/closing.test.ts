import { describe, expect, it } from 'vitest'
import { followUps, journalDraft, playedIncidents } from './closing'
import { addIncident, addNode } from './deck'
import { emptyExpedition, emptyRun, type Expedition } from './model'
import { addExtra, finish, reachNode } from './run'

function fixture() {
  let e: Expedition = { ...emptyExpedition('Cesta k hradu'), goal: 'Dojít k Bílému hradu' }
  e = addNode(e, 'Zvrat')
  const ids: Record<string, string> = {}
  for (const t of ['Lavina', 'Zlobři', 'Nepoužitá']) {
    const r = addIncident(e, '')
    ids[t] = r.incident.id
    e = { ...r.expedition, incidents: r.expedition.incidents.map((i) => (i.id === r.incident.id ? { ...i, title: t } : i)) }
  }
  return { e, ids, run: emptyRun('x', 'p', e.id) }
}

describe('shrnutí výpravy do žurnálu', () => {
  it('příhody v pořadí, jak proběhly, s výsledkem a poznámkou; neodehrané se nezmiňují', () => {
    const { e, ids, run } = fixture()
    let r = finish(run, ids.Zlobři, 'uspech', 'Zlobři utekli', '2026-11-24T10:00:00.000Z')
    r = finish(r, ids.Lavina, 'jinak', '', '2026-11-24T11:00:00.000Z')
    r = reachNode(r, e.nodes[0].id)
    r = { ...r, notes: '  Družina je unavená.  ' }
    const d = journalDraft(e, r)
    expect(d.title).toBe('Výprava: Cesta k hradu')
    expect(d.text).toBe(
      [
        'Cíl výpravy: Dojít k Bílému hradu',
        '',
        'Co se odehrálo:',
        '• Zlobři (úspěch): Zlobři utekli',
        '• Lavina (jinak)',
        '',
        'Zlomové okamžiky: Zvrat.',
        '',
        'Družina je unavená.',
      ].join('\n'),
    )
    expect(d.text).not.toContain('Nepoužitá')
  })

  it('bez času se řadí podle balíčků; vymyšlená příhoda je na konci', () => {
    const { e, ids, run } = fixture()
    let r = finish(run, ids.Zlobři, 'uspech', '', '')
    r = finish(r, ids.Lavina, 'uspech', '', '')
    const extra = addExtra(e, r, 'Bouře')
    r = finish(extra.run, extra.incident.id, 'neuspech', 'Promokli', '')
    expect(playedIncidents(e, r).map((i) => i.title)).toEqual(['Lavina', 'Zlobři', 'Bouře'])
  })

  it('prázdná výprava dá jen název', () => {
    const e = emptyExpedition('')
    expect(journalDraft(e, emptyRun('x', 'p', e.id))).toEqual({ title: 'Výprava: bez názvu', text: '' })
  })
})

describe('další výpravy dobrodružství', () => {
  it('po této výpravě v pořadí, bez těch, které družina už hrála', () => {
    const a = { ...emptyExpedition('A'), id: 'a' }
    const b = { ...emptyExpedition('B'), id: 'b' }
    const c = { ...emptyExpedition('C'), id: 'c' }
    const all = [a, b, c]
    const runs = [emptyRun('r', 'p1', 'b'), emptyRun('r', 'jina', 'c')]
    expect(followUps(a, ['a', 'b', 'c'], all, runs, 'p1').map((e) => e.id)).toEqual(['c'])
    expect(followUps(a, ['a', 'b', 'c'], all, runs, 'jina').map((e) => e.id)).toEqual(['b'])
    expect(followUps(c, ['a', 'b', 'c'], all, [], 'p1')).toEqual([])
    expect(followUps(a, ['b', 'c'], all, [], 'p1')).toEqual([])
  })
})
