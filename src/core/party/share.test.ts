import { describe, expect, it } from 'vitest'
import { emptyParty, type JournalEntry, type Party } from './model'
import {
  approveEntry,
  buildPartyBundle,
  mergeIncoming,
  rejectEntry,
  sanitizePartyBundle,
} from './share'

const entry = (id: string, extra: Partial<JournalEntry> = {}): JournalEntry => ({
  id,
  at: '2026-01-01T12:00:00.000Z',
  by: 'GM',
  title: `Zápis ${id}`,
  text: 'text',
  ...extra,
})

function gmParty(): Party {
  return {
    ...emptyParty('Vlčí stezka'),
    id: 'p1',
    notes: 'tajné poznámky',
    members: [
      { id: 'm1', name: 'Arwen', characterId: 'c1' },
      { id: 'm2', name: 'Boromír' },
    ],
    journal: [
      entry('e1', { session: { xp: { m1: 6, m2: 4 }, applied: ['m1'] } }),
      entry('e2', { at: '2026-02-01T12:00:00.000Z' }),
      entry('e3', { status: 'navrh', by: 'Pavel' }),
    ],
  }
}

describe('balíček družiny', () => {
  it('Průvodce posílá jen schválené zápisy bez „připsáno“; návrhy ne', () => {
    const b = buildPartyBundle(gmParty(), 'GM')
    expect(b.from).toBe('pruvodce')
    expect(b.journal.map((e) => e.id)).toEqual(['e1', 'e2'])
    expect(b.journal[0].xp).toEqual({ m1: 6, m2: 4 })
    expect(JSON.stringify(b)).not.toContain('applied')
    expect(b.party.notes).toBe('tajné poznámky')
    expect(b.party.members[0].characterId).toBe('c1')
  })

  it('jen novější než poslední odeslání', () => {
    const b = buildPartyBundle(gmParty(), 'GM', '2026-01-15T00:00:00.000Z')
    expect(b.journal.map((e) => e.id)).toEqual(['e2'])
  })

  it('hráč posílá jen své návrhy a nepřenáší poznámky Průvodce', () => {
    const copy = mergeIncoming(undefined, buildPartyBundle(gmParty(), 'GM')).party!
    const withProposal: Party = {
      ...copy,
      journal: [entry('h1', { status: 'navrh', by: 'Pavel' }), ...copy.journal],
    }
    const b = buildPartyBundle(withProposal, 'Pavel')
    expect(b.from).toBe('hrac')
    expect(b.journal.map((e) => e.id)).toEqual(['h1'])
    expect(b.party.notes).toBe('')
  })

  it('očištění: neznámá verze, chybějící ID, špatné zápisy a čísla', () => {
    expect(sanitizePartyBundle({ v: 9 }).bundle).toBeUndefined()
    expect(sanitizePartyBundle({ v: 1, party: {} }).bundle).toBeUndefined()
    const r = sanitizePartyBundle({
      v: 1,
      type: 'druzina',
      from: 'hrac',
      party: {
        id: 'p',
        name: 5,
        members: [
          { id: 'm', name: ' ' },
          { id: 'n', name: 'Ok' },
        ],
      },
      journal: [
        { id: 'a', at: 'nesmysl' },
        { id: 'b', at: '2026-01-01T00:00:00Z', title: 'T', xp: { m: 5, n: -1, o: 'x' } },
      ],
      rejected: ['a', 3],
    })
    expect(r.bundle?.party.members.map((m) => m.id)).toEqual(['n'])
    expect(r.bundle?.party.name).toBe('Družina')
    expect(r.bundle?.journal).toHaveLength(1)
    expect(r.bundle?.journal[0].xp).toEqual({ m: 5 })
    expect(r.bundle?.rejected).toEqual(['a'])
    expect(r.errors.length).toBe(1)
  })
})

describe('přijetí Průvodcovy družiny hráčem', () => {
  const bundle = buildPartyBundle(gmParty(), 'GM')

  it('nová kopie: role hráč, zápisy schválené, členové i zkušenosti', () => {
    const r = mergeIncoming(undefined, bundle)
    expect(r.error).toBeUndefined()
    expect(r.report.created).toBe(true)
    expect(r.party?.role).toBe('hrac')
    expect(r.party?.journal.map((e) => e.id)).toEqual(['e2', 'e1'])
    expect(r.party?.journal.find((e) => e.id === 'e1')?.session).toEqual({
      xp: { m1: 6, m2: 4 },
      applied: [],
    })
    expect(r.party?.members).toHaveLength(2)
  })

  it('opakovaný import nic nemění; změna zápisu u Průvodce přepíše kopii a zachová „připsáno“', () => {
    const first = mergeIncoming(undefined, bundle).party!
    const applied: Party = {
      ...first,
      journal: first.journal.map((e) =>
        e.id === 'e1' && e.session ? { ...e, session: { ...e.session, applied: ['m1'] } } : e,
      ),
    }
    expect(mergeIncoming(applied, bundle).report).toMatchObject({
      added: [],
      updated: [],
      ignored: 2,
    })
    const changed = {
      ...bundle,
      journal: bundle.journal.map((e) =>
        e.id === 'e1' ? { ...e, text: 'nové znění', edited: '2026-03-01T00:00:00.000Z' } : e,
      ),
    }
    const r = mergeIncoming(applied, changed)
    expect(r.report.updated.map((e) => e.id)).toEqual(['e1'])
    const e1 = r.party!.journal.find((e) => e.id === 'e1')!
    expect(e1.text).toBe('nové znění')
    expect(e1.session?.applied).toEqual(['m1'])
  })

  it('schválený návrh nahradí místní návrh; zamítnutý se označí; vlastní návrhy zůstanou', () => {
    const first = mergeIncoming(undefined, bundle).party!
    const mine: Party = {
      ...first,
      journal: [
        entry('h1', { status: 'navrh', by: 'Pavel' }),
        entry('h2', { status: 'navrh', by: 'Pavel' }),
        entry('h3', { status: 'navrh', by: 'Pavel' }),
        ...first.journal,
      ],
    }
    const gm: Party = {
      ...gmParty(),
      journal: [...gmParty().journal, entry('h1', { by: 'Pavel' })],
      rejected: ['h2'],
    }
    const r = mergeIncoming(mine, buildPartyBundle(gm, 'GM'))
    const byId = (id: string) => r.party!.journal.find((e) => e.id === id)!
    expect(byId('h1').status).toBeUndefined()
    expect(byId('h2').status).toBe('zamitnuto')
    expect(byId('h3').status).toBe('navrh')
  })

  it('družinu, kterou vedu já, nepřijmu', () => {
    expect(mergeIncoming(gmParty(), bundle).error).toMatch(/vedete vy/)
  })
})

describe('návrhy hráčů u Průvodce', () => {
  const player = (): Party => {
    const copy = mergeIncoming(undefined, buildPartyBundle(gmParty(), 'GM')).party!
    return {
      ...copy,
      journal: [
        entry('h1', { status: 'navrh', by: 'Pavel', at: '2026-03-01T12:00:00.000Z' }),
        ...copy.journal,
      ],
    }
  }

  it('nový návrh se přidá jako návrh a Průvodce ho schválí, nebo zamítne', () => {
    const r = mergeIncoming(gmParty(), buildPartyBundle(player(), 'Pavel'))
    expect(r.error).toBeUndefined()
    expect(r.report.added.map((e) => e.id)).toEqual(['h1'])
    const got = r.party!.journal.find((e) => e.id === 'h1')!
    expect(got.status).toBe('navrh')
    const ok = approveEntry(r.party!, 'h1')
    expect(ok.journal.find((e) => e.id === 'h1')?.status).toBeUndefined()
    expect(ok.journal.find((e) => e.id === 'h1')?.edited).toBeTruthy()
    // schválený se příště pošle hráčům
    expect(buildPartyBundle(ok, 'GM').journal.map((e) => e.id)).toContain('h1')
    const no = rejectEntry(r.party!, 'h1')
    expect(no.journal.find((e) => e.id === 'h1')).toBeUndefined()
    expect(no.rejected).toEqual(['h1'])
    expect(buildPartyBundle(no, 'GM').rejected).toEqual(['h1'])
  })

  it('zamítnutý návrh se znovu nepřijme; schválený zápis hráč měnit nemůže; neznámá družina je chyba', () => {
    const no = rejectEntry(
      mergeIncoming(gmParty(), buildPartyBundle(player(), 'Pavel')).party!,
      'h1',
    )
    expect(mergeIncoming(no, buildPartyBundle(player(), 'Pavel')).report.added).toEqual([])
    const p = player()
    const tampered: Party = {
      ...p,
      journal: p.journal.map((e) =>
        e.id === 'e2' ? { ...e, status: 'navrh' as const, text: 'podvrh' } : e,
      ),
    }
    const r = mergeIncoming(gmParty(), buildPartyBundle(tampered, 'Pavel'))
    expect(r.party!.journal.find((e) => e.id === 'e2')?.text).toBe('text')
    expect(mergeIncoming(undefined, buildPartyBundle(player(), 'Pavel')).error).toMatch(/nemáte/)
    expect(mergeIncoming(player(), buildPartyBundle(player(), 'Pavel')).error).toMatch(
      /jen Průvodce/,
    )
  })
})
