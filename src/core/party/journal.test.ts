import { describe, expect, it } from 'vitest'
import { characterOf, emptyCharacter, type CharacterLog } from '../character/model'
import type { JournalEntry, Party } from './model'
import {
  addFreeMember,
  addLocalMember,
  canChange,
  conflictEntry,
  editedEntry,
  markApplied,
  newEntry,
  removeMember,
  withEntry,
  withoutEntry,
  xpGrant,
} from './journal'

const party = (): Party => ({ id: 'p', name: 'D', notes: '', members: [], journal: [], updated: '2026-11-01' })
const entry = (x: Partial<JournalEntry> = {}): JournalEntry => ({ id: 'e', at: '2026-11-01', by: 'A', title: 'T', text: '', ...x })

describe('členové družiny', () => {
  it('přidá člena s postavou i jen se jménem, prázdné jméno ignoruje', () => {
    let p = addLocalMember(party(), 'c1', '')
    expect(p.members[0]).toMatchObject({ name: 'Postava', characterId: 'c1' })
    p = addFreeMember(p, '  Bor ')
    expect(p.members[1]).toMatchObject({ name: 'Bor' })
    expect(addFreeMember(p, '  ')).toBe(p)
    expect(removeMember(p, p.members[0].id).members).toHaveLength(1)
  })
})

describe('žurnál', () => {
  it('zápis hráče je návrh, zápis Průvodce ne; prázdný zápis nevznikne', () => {
    expect(newEntry('H', false, 'a', '')?.status).toBe('navrh')
    expect(newEntry('P', true, '', 'text')).toMatchObject({ title: 'Zápis', text: 'text' })
    expect(newEntry('P', true, 'a', 'b')?.status).toBeUndefined()
    expect(newEntry('P', true, ' ', ' ')).toBeUndefined()
  })

  it('hráč mění jen návrhy, upravený zamítnutý návrh jde znovu ke schválení', () => {
    expect(canChange(false, entry())).toBe(false)
    expect(canChange(false, entry({ status: 'zamitnuto' }))).toBe(true)
    expect(canChange(true, entry())).toBe(true)
    expect(editedEntry(entry({ status: 'zamitnuto' }), 'T').status).toBe('navrh')
    expect(editedEntry(entry(), 'T')).toMatchObject({ edited: 'T' })
  })

  it('přidání, odebrání a zápis konfliktu', () => {
    const p = withEntry(party(), conflictEntry('P', 'souhrn', 'D'))
    expect(p.journal[0]).toMatchObject({ title: 'Konflikt', text: 'souhrn', at: 'D' })
    expect(withoutEntry(p, p.journal[0].id).journal).toEqual([])
  })
})

describe('zkušenosti ze sezení', () => {
  const log: CharacterLog = { id: 'c', events: [] }
  const member = { id: 'm', name: 'Bor', characterId: 'c' }
  const session = entry({ session: { xp: { m: 4 }, applied: [] } })

  it('připíše body jednou', () => {
    const g = xpGrant(session, member, log, 'A')
    expect(g.ok).toBe(true)
    if (!g.ok) return
    expect(g.xp).toBe(4)
    expect(g.events.some((e) => e.path === 'xp' && e.value === characterOf(log).xp + 4)).toBe(true)
    const done = markApplied(session, 'm')
    expect(xpGrant(done, member, log, 'A')).toEqual({ ok: false, reason: 'uz-pripsano' })
  })

  it('bez postavy v zařízení nebo bez bodů neudělá nic', () => {
    expect(xpGrant(session, member, undefined, 'A')).toEqual({ ok: false, reason: 'bez-postavy' })
    expect(xpGrant(session, { id: 'x', name: 'N' }, log, 'A').ok).toBe(false)
    expect(emptyCharacter('c').xp).toBeTypeOf('number')
  })
})
