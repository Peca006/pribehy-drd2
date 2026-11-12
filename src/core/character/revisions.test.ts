import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearCharacterDraft,
  loadCharacterDraft,
  sanitizeCharacter,
  saveCharacterDraft,
} from './drafts'
import { characterOf, emptyCharacter, eventsFor, type CharacterLog } from './model'
import { changesBetween, groupRevisions, revertEvents, revisionChanges } from './revisions'

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

describe('revize', () => {
  it('změny zveřejněné společně tvoří jednu revizi', () => {
    const log = logWith([base, 'Tvorba'], [{ cash: 240, equipment: ['Meč'] }, 'Nákup'])
    const revs = groupRevisions(log.events)
    expect(revs.map((r) => [r.note, r.events.length])).toEqual([
      ['Tvorba', 5],
      ['Nákup', 2],
    ])
  })

  it('starší záznamy bez ID revize se seskupí podle času, autora a poznámky', () => {
    const log = logWith([base, 'Tvorba'])
    const old = log.events.map(({ rev: _rev, ...e }) => e)
    expect(groupRevisions(old)).toHaveLength(1)
  })

  it('revisionChanges ukáže před → po', () => {
    const log = logWith([base, 'Tvorba'], [{ cash: 240, equipment: ['Meč'] }, 'Nákup'])
    const ch = revisionChanges(log, groupRevisions(log.events)[1])
    expect(ch).toContainEqual({ path: 'cash', before: 600, after: 240 })
    expect(ch).toContainEqual({ path: 'equipment', before: [], after: ['Meč'] })
  })

  it('revertEvents vrátí původní hodnoty a historii nemaže', () => {
    const log = logWith([base, 'Tvorba'], [{ cash: 240, equipment: ['Meč'] }, 'Nákup'])
    const rev = groupRevisions(log.events)[1]
    const undo = revertEvents(log, rev, 'Vypravěč', 'Vrácení: Nákup')
    const after = characterOf({ id: 'a', events: [...log.events, ...undo] })
    expect(after.cash).toBe(600)
    expect(after.equipment).toEqual([])
    expect(after.name).toBe('Jarik')
    expect(new Set(undo.map((e) => e.rev)).size).toBe(1)
    expect(log.events).toHaveLength(7)
  })

  it('vrácení nezasáhne pole, která pozdější revize už změnila jinak, jen je přepíše', () => {
    const log = logWith([base, 'Tvorba'], [{ cash: 240 }, 'Nákup'], [{ cash: 100 }, 'Další nákup'])
    const undo = revertEvents(log, groupRevisions(log.events)[1], 'V', 'x')
    expect(characterOf({ id: 'a', events: [...log.events, ...undo] }).cash).toBe(600)
  })

  it('vrácení smaže položku v mapě, která v revizi vznikla', () => {
    const log = logWith([base, 'Tvorba'], [{ professions: { 'povolani:lovec': 2 } }, 'Přestup'])
    const undo = revertEvents(log, groupRevisions(log.events)[1], 'V', 'x')
    expect(characterOf({ id: 'a', events: [...log.events, ...undo] }).professions).toEqual({})
  })

  it('changesBetween popíše rozdíl dvou postav', () => {
    expect(changesBetween(base, { ...base, cash: 1 })).toEqual([
      { path: 'cash', before: 600, after: 1 },
    ])
  })
})

const store = new Map<string, string>()
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
} as Storage

describe('návrh úpravy postavy', () => {
  beforeEach(() => store.clear())

  it('uloží, načte a smaže', () => {
    saveCharacterDraft('a', 7, { ...base, cash: 5 })
    const d = loadCharacterDraft('a')
    expect(d?.base).toBe(7)
    expect(d?.character.cash).toBe(5)
    clearCharacterDraft('a')
    expect(loadCharacterDraft('a')).toBeUndefined()
  })

  it('očistí neznámá pole a špatné typy; poškozená data se ignorují', () => {
    const c = sanitizeCharacter(
      { name: 5, cash: -3, equipment: ['a', 1], professions: { x: 2, y: 0, z: 'a' }, evil: 1 },
      emptyCharacter('a'),
    )
    expect(c.name).toBe('')
    expect(c.cash).toBe(0)
    expect(c.equipment).toEqual(['a'])
    expect(c.professions).toEqual({ x: 2 })
    expect('evil' in c).toBe(false)
    store.set('drd2-char-draft:a', '{x')
    expect(loadCharacterDraft('a')).toBeUndefined()
  })
})
