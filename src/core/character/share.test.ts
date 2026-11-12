import { beforeEach, describe, expect, it } from 'vitest'
import { characterOf, emptyCharacter, eventsFor, type CharacterLog } from './model'
import { loadReviews, markSent, recordResponse } from './reviews'
import {
  analyzeImport,
  applyRevisions,
  buildRevisionBundle,
  decodeBundle,
  encodeBundle,
  sanitizeBundle,
  sanitizeEvent,
  type RevisionBundle,
} from './share'
import { groupRevisions } from './revisions'

const base = {
  ...emptyCharacter('a'),
  name: 'Jarik',
  attributes: { Tělo: 6, Duše: 5, Vliv: 4 },
  cash: 600,
}

function logWith(...steps: [Partial<typeof base>, string][]): CharacterLog {
  let cur = emptyCharacter('a')
  const events = []
  let t = 0
  for (const [patch, note] of steps) {
    const next = { ...cur, ...patch }
    events.push(...eventsFor(cur, next, 'Petr', note, new Date(2026, 0, 1, 0, t++).toISOString()))
    cur = next
  }
  return { id: 'a', events }
}

const store = new Map<string, string>()
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
} as Storage
beforeEach(() => store.clear())

describe('balíček revizí a kód', () => {
  it('celá postava přežije kód (stlačení) i očištění', async () => {
    const log = logWith([base, 'Tvorba'], [{ cash: 240, equipment: ['Meč'] }, 'Nákup'])
    const code = await encodeBundle(buildRevisionBundle(log, 'Jarik'))
    expect(code.startsWith('DRD2:')).toBe(true)
    const { bundle, errors } = await decodeBundle(code)
    expect(errors).toEqual([])
    const applied = applyRevisions(
      undefined,
      bundle as RevisionBundle,
      new Set(groupRevisions(log.events).map((r) => r.id)),
    )
    expect(characterOf(applied)).toEqual(characterOf(log))
  })

  it('jen revize po zvolené revizi; základ je ID předchozí revize', () => {
    const log = logWith([base, 'Tvorba'], [{ cash: 240 }, 'Nákup'], [{ cash: 100 }, 'Další'])
    const revs = groupRevisions(log.events)
    const b = buildRevisionBundle(log, 'J', revs[0].id)
    expect(b.base).toBe(revs[0].id)
    expect(b.revisions.map((r) => r.note)).toEqual(['Nákup', 'Další'])
    expect(buildRevisionBundle(log, 'J', 'neznama').base).toBeNull()
  })

  it('poškozený kód nebo cizí data se odmítnou', async () => {
    expect((await decodeBundle('DRD2:@@@')).bundle).toBeUndefined()
    expect((await decodeBundle('{x')).bundle).toBeUndefined()
    expect(sanitizeBundle({ v: 9 }).bundle).toBeUndefined()
    expect(
      sanitizeBundle({ v: 1, type: 'revize', char: 'a', revisions: [] }).bundle,
    ).toBeUndefined()
  })

  it('sanitizeEvent pustí jen známé cesty a správné typy', () => {
    expect(sanitizeEvent({ id: '1', path: 'cash', value: 5 })).toEqual({
      id: '1',
      path: 'cash',
      value: 5,
    })
    expect(sanitizeEvent({ id: '1', path: 'cash', value: -5 })).toBeUndefined()
    expect(sanitizeEvent({ id: '1', path: 'cash', value: '5' })).toBeUndefined()
    expect(sanitizeEvent({ id: '1', path: '__proto__.x', value: 1 })).toBeUndefined()
    expect(sanitizeEvent({ id: '1', path: 'id', value: 'jiny' })).toBeUndefined()
    expect(sanitizeEvent({ id: '1', path: 'attributes.Síla', value: 3 })).toBeUndefined()
    expect(sanitizeEvent({ id: '1', path: 'equipment', value: ['a', 3, 'b'] })?.value).toEqual([
      'a',
      'b',
    ])
    expect(sanitizeEvent({ id: '1', path: 'professions.x' })).toEqual({
      id: '1',
      path: 'professions.x',
    })
    expect(sanitizeEvent({ id: '1', path: 'xp', value: 12 })?.value).toBe(12)
    expect(sanitizeEvent({ id: '1', path: 'xp', value: -1 })).toBeUndefined()
    const scars = sanitizeEvent({
      id: '1',
      path: 'scars',
      value: [
        { id: 'a', attribute: 'Tělo', severity: 2, note: 'kotník' },
        { id: 'b', attribute: 'Síla', severity: 2, note: 'x' },
        { id: 'c', attribute: 'Duše', severity: 99, note: 'x' },
      ],
    })
    expect(scars?.value).toEqual([{ id: 'a', attribute: 'Tělo', severity: 2, note: 'kotník' }])
  })
})

describe('analýza importu', () => {
  const player = logWith([base, 'Tvorba'], [{ cash: 240, equipment: ['Meč'] }, 'Nákup'])
  const revs = groupRevisions(player.events)

  it('postava, kterou příjemce nemá, je nová postava', () => {
    const a = analyzeImport(undefined, buildRevisionBundle(player, 'J'))
    expect(a.kind).toBe('nova-postava')
    expect(a.fresh).toHaveLength(2)
  })

  it('revize navazuje na poslední revizi příjemce', () => {
    const gm: CharacterLog = { id: 'a', events: player.events.filter((e) => e.rev === revs[0].id) }
    const a = analyzeImport(gm, buildRevisionBundle(player, 'J', revs[0].id))
    expect(a.kind).toBe('navazuje')
    expect(a.fresh.map((r) => r.note)).toEqual(['Nákup'])
    expect(a.conflicts).toEqual([])
  })

  it('nic nového, neznámý základ a rozdílný stav s konfliktem', () => {
    expect(analyzeImport(player, buildRevisionBundle(player, 'J', revs[0].id)).kind).toBe(
      'nic-noveho',
    )
    const bundle = buildRevisionBundle(player, 'J', revs[0].id)
    const stranger: CharacterLog = {
      id: 'a',
      events: eventsFor(emptyCharacter('a'), { ...base, name: 'X' }, 'GM', 'Jiné'),
    }
    expect(analyzeImport(stranger, bundle).kind).toBe('neznamy-zaklad')
    // vypravěč přidal po společném základu vlastní změnu hotovosti
    const gmEvents = [
      ...player.events.filter((e) => e.rev === revs[0].id),
      ...eventsFor({ ...base }, { ...base, cash: 1 }, 'GM', 'Odměna'),
    ]
    const a = analyzeImport({ id: 'a', events: gmEvents }, bundle)
    expect(a.kind).toBe('jiny-stav')
    expect(a.conflicts).toEqual(['cash'])
  })

  it('přijetí přidá jen vybrané revize a nezdvojí je při opakování', () => {
    const gm: CharacterLog = { id: 'a', events: player.events.filter((e) => e.rev === revs[0].id) }
    const b = buildRevisionBundle(player, 'J', revs[0].id)
    const once = applyRevisions(gm, b, new Set([revs[1].id]))
    expect(characterOf(once).equipment).toEqual(['Meč'])
    expect(applyRevisions(once, b, new Set([revs[1].id])).events).toHaveLength(once.events.length)
    expect(applyRevisions(gm, b, new Set()).events).toHaveLength(gm.events.length)
    expect(groupRevisions(once.events).map((r) => r.note)).toEqual(['Tvorba', 'Nákup'])
  })
})

describe('stav revizí hráče', () => {
  it('označí odeslané a zapíše odpověď', () => {
    markSent('a', ['r1', 'r2'])
    expect(loadReviews('a').sentUpTo).toBe('r2')
    recordResponse('a', ['r1'], ['r2'], 'Moc peněz')
    const r = loadReviews('a')
    expect(r.status).toEqual({ r1: 'prijato', r2: 'zamitnuto' })
    expect(r.note).toBe('Moc peněz')
    store.set('drd2-char-reviews:b', '{nesmysl')
    expect(loadReviews('b').status).toEqual({})
  })
})
