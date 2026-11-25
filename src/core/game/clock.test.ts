import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { closeDb } from '../db'
import {
  activate,
  activeMember,
  bars,
  elapsed,
  fairness,
  finish,
  formatClock,
  pause,
  plan,
  playedSince,
  resume,
  setAbsent,
  setPlanned,
  setRun,
  startSitting,
  totals,
  wallClock,
} from './clock'
import { getSitting, listSittings, openSitting, removePartySittings, saveSitting } from './store'

const MIN = 60_000
const T0 = 1_000_000

describe('časomíra sezení', () => {
  it('nový stav je v pauze a nikdo není aktivní', () => {
    const s = startSitting('p1', T0)
    expect(s.status).toBe('pauza')
    expect(activeMember(s)).toBeUndefined()
    expect(totals(s, T0 + MIN)).toEqual({})
  })

  it('klepnutí přepíná hráče a čas teče jen aktivnímu', () => {
    let s = startSitting('p1', T0)
    s = activate(s, 'a', T0)
    s = activate(s, 'b', T0 + 5 * MIN)
    expect(activeMember(s)).toBe('b')
    expect(totals(s, T0 + 8 * MIN)).toEqual({ a: 5 * MIN, b: 3 * MIN })
    s = activate(s, 'a', T0 + 10 * MIN)
    expect(totals(s, T0 + 12 * MIN)).toEqual({ a: 7 * MIN, b: 5 * MIN })
    expect(elapsed(s, T0 + 12 * MIN)).toBe(12 * MIN)
  })

  it('klepnutí na aktivního hráče sezení pozastaví, pauza se do času nepočítá a pokračuje se s ním', () => {
    let s = activate(startSitting('p1', T0), 'a', T0)
    s = activate(s, 'a', T0 + 4 * MIN)
    expect(s.status).toBe('pauza')
    expect(activeMember(s)).toBeUndefined()
    expect(totals(s, T0 + 30 * MIN)).toEqual({ a: 4 * MIN })
    s = resume(s, T0 + 30 * MIN)
    expect(activeMember(s)).toBe('a')
    expect(totals(s, T0 + 31 * MIN)).toEqual({ a: 5 * MIN })
    expect(wallClock(s, T0 + 31 * MIN)).toBe(31 * MIN)
  })

  it('pauza a pokračování bez aktivního hráče nic nezmění', () => {
    const s = startSitting('p1', T0)
    expect(pause(s, T0 + MIN)).toBe(s)
    expect(resume(s, T0 + MIN)).toBe(s)
  })

  it('ukončení uzavře běžící úsek, čas se pak už nemění a sezení se nedá upravit', () => {
    let s = activate(startSitting('p1', T0), 'a', T0)
    s = finish(s, T0 + 6 * MIN)
    expect(s.status).toBe('hotovo')
    expect(totals(s, T0 + 99 * MIN)).toEqual({ a: 6 * MIN })
    expect(activate(s, 'b', T0 + 99 * MIN)).toBe(s)
    expect(finish(s, T0 + 100 * MIN)).toBe(s)
  })

  it('hodiny jdoucí zpět (změna času v zařízení) nedají záporný čas', () => {
    let s = activate(startSitting('p1', T0), 'a', T0 + 5 * MIN)
    s = activate(s, 'b', T0)
    expect(totals(s, T0 + MIN).a).toBe(0)
  })

  it('pruhy mají společné měřítko podle nejdelšího času', () => {
    let s = activate(startSitting('p1', T0), 'a', T0)
    s = activate(s, 'b', T0 + 8 * MIN)
    s = finish(s, T0 + 10 * MIN)
    expect(bars(s, ['a', 'b', 'c'], T0 + 10 * MIN)).toEqual({ a: 1, b: 0.25, c: 0 })
    expect(bars(startSitting('p1', T0), ['a'], T0)).toEqual({ a: 0 })
  })

  it('čas se zobrazí jako m:ss a od hodiny jako h:mm:ss', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(65_000)).toBe('1:05')
    expect(formatClock(3_725_000)).toBe('1:02:05')
    expect(formatClock(-5)).toBe('0:00')
  })
})

describe('úložiště sezení', () => {
  beforeEach(async () => {
    await closeDb()
    globalThis.indexedDB = new IDBFactory()
  })

  it('najde nedokončené sezení družiny a smaže sezení družiny', async () => {
    const done = finish(activate(startSitting('p1', T0), 'a', T0), T0 + MIN)
    const open = activate(startSitting('p1', T0 + 10 * MIN), 'b', T0 + 10 * MIN)
    const other = startSitting('p2', T0)
    for (const s of [done, open, other]) await saveSitting(s)
    expect((await openSitting('p1'))?.id).toBe(open.id)
    expect((await listSittings('p1')).map((s) => s.id)).toEqual([open.id, done.id])
    expect(await openSitting('p3')).toBeUndefined()
    await removePartySittings('p1')
    expect(await listSittings('p1')).toEqual([])
    expect((await getSitting(other.id))?.partyId).toBe('p2')
  })
})

describe('spravedlivý prostor', () => {
  const ids = ['a', 'b', 'c']
  // a hrál 15 min, b 3 min, c 12 min
  const game = () => {
    let s = startSitting('p1', T0)
    s = activate(s, 'a', T0)
    s = activate(s, 'b', T0 + 15 * MIN)
    s = activate(s, 'c', T0 + 18 * MIN)
    return pause(s, T0 + 30 * MIN)
  }

  it('spravedlivý díl je průměr a pozadu je ten pod 70 % dílu', () => {
    const f = fairness(game(), ids, T0 + 30 * MIN)
    expect(f.share).toBe(10 * MIN)
    expect(f.ready).toBe(true)
    expect(f.behind).toEqual(['b'])
  })

  it('před 10 minutami hry se upozornění neukazuje', () => {
    let s = activate(startSitting('p1', T0), 'a', T0)
    s = pause(s, T0 + 8 * MIN)
    const f = fairness(s, ids, T0 + 8 * MIN)
    expect(f.ready).toBe(false)
    expect(f.behind).toEqual([])
  })

  it('člen mimo hru se do dílu nepočítá a není pozadu', () => {
    const s = setAbsent(game(), 'b', true, T0 + 30 * MIN)
    const f = fairness(s, ids, T0 + 30 * MIN)
    expect(f.present).toEqual(['a', 'c'])
    expect(f.share).toBe(13.5 * MIN)
    expect(f.behind).toEqual([])
    expect(setAbsent(s, 'b', false, T0 + 30 * MIN).absent).toEqual([])
  })

  it('mimo hru pozastaví aktivního člena a aktivace ho vrátí do hry', () => {
    let s = activate(startSitting('p1', T0), 'a', T0)
    s = setAbsent(s, 'a', true, T0 + MIN)
    expect(s.status).toBe('pauza')
    expect(totals(s, T0 + 5 * MIN).a).toBe(MIN)
    expect(s.absent).toEqual(['a'])
    s = activate(s, 'a', T0 + 5 * MIN)
    expect(s.absent).toEqual([])
  })

  it('hotové sezení se neměnní a samotný hráč nikdy není pozadu', () => {
    const done = finish(game(), T0 + 30 * MIN)
    expect(setAbsent(done, 'a', true, T0 + 31 * MIN)).toBe(done)
    expect(fairness(game(), ['a'], T0 + 30 * MIN).behind).toEqual([])
  })
})

describe('plán podle délky sezení', () => {
  it('bez plánu nic nevrací, plán se dá nastavit a zrušit', () => {
    const s = startSitting('p1', T0)
    expect(plan(s, T0, 3)).toBeUndefined()
    const p = setPlanned(s, 120)
    expect(p.planned).toBe(120)
    expect('planned' in setPlanned(p, 0)).toBe(false)
    expect('planned' in setPlanned(p, undefined)).toBe(false)
  })

  it('zbývá celkem a na jednoho hráče ve hře', () => {
    const s = setPlanned(startSitting('p1', T0), 120)
    const r = plan(s, T0 + 30 * MIN, 3)!
    expect(r.remainingMs).toBe(90 * MIN)
    expect(r.perMemberMs).toBe(30 * MIN)
    expect(r.over).toBe(false)
    expect(r.neededMs).toBeUndefined()
  })

  it('překročený plán nedělí čas', () => {
    const s = setPlanned(startSitting('p1', T0), 60)
    const r = plan(s, T0 + 70 * MIN, 3)!
    expect(r.over).toBe(true)
    expect(r.remainingMs).toBe(-10 * MIN)
    expect(r.perMemberMs).toBe(0)
  })

  it('odhad příhod podle tempa: stihnete, nebo ne', () => {
    const s = setPlanned(startSitting('p1', T0), 120)
    // 2 příhody za 40 min = 20 min na příhodu, zbývá 80 min
    expect(plan(s, T0 + 40 * MIN, 3, { played: 2, left: 4 })).toMatchObject({
      perIncidentMs: 20 * MIN,
      neededMs: 80 * MIN,
      fits: true,
    })
    expect(plan(s, T0 + 40 * MIN, 3, { played: 2, left: 5 })).toMatchObject({
      neededMs: 100 * MIN,
      fits: false,
    })
    // bez odehrané příhody odhad nejde
    expect(plan(s, T0 + 40 * MIN, 3, { played: 0, left: 5 })?.neededMs).toBeUndefined()
  })

  it('vazba na vedení výpravy a počet příhod odehraných od začátku sezení', () => {
    const s = startSitting('p1', T0)
    expect(setRun(s, 'r1').runId).toBe('r1')
    expect('runId' in setRun(setRun(s, 'r1'), undefined)).toBe(false)
    const at = (min: number) => new Date(T0 + min * MIN).toISOString()
    expect(
      playedSince(
        {
          a: { state: 'odehrana', at: at(-5) },
          b: { state: 'odehrana', at: at(10) },
          c: { state: 'odehrana', at: at(20) },
          d: { state: 'nasazena', at: at(30) },
          e: { state: 'odehrana' },
        },
        T0,
      ),
    ).toBe(2)
  })
})
