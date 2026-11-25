import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { closeDb } from '../db'
import {
  activate,
  activeMember,
  bars,
  elapsed,
  finish,
  formatClock,
  pause,
  resume,
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
