import { describe, expect, it } from 'vitest'
import type { JournalEntry, Party } from './model'
import { buildPartyBundle } from './share'
import { choosableEntries, sinceFor } from './shareRange'

const e = (id: string, at: string, extra: Partial<JournalEntry> = {}): JournalEntry => ({ id, at, by: 'P', title: id, text: '', ...extra })
const journal = [e('c', '2026-11-03T10:00:00.000Z'), e('a', '2026-11-01T10:00:00.000Z'), e('n', '2026-11-02T10:00:00.000Z', { status: 'navrh' }), e('b', '2026-11-02T12:00:00.000Z')]
const party: Party = { id: 'p', name: 'D', notes: '', members: [], journal, updated: '2026-11-04' }

describe('začátek sdílení družiny', () => {
  it('nabízí jen schválené zápisy od nejstaršího', () => {
    expect(choosableEntries(journal).map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })
  it('podle režimu vybere zápisy; zvolený zápis se sdílí včetně sebe', () => {
    const ids = (since: string | null) => buildPartyBundle(party, 'P', since).journal.map((x) => x.id).sort()
    expect(ids(sinceFor(journal, 'cela', '2026-11-02T00:00:00.000Z'))).toEqual(['a', 'b', 'c'])
    expect(ids(sinceFor(journal, 'nove', '2026-11-02T00:00:00.000Z'))).toEqual(['b', 'c'])
    expect(ids(sinceFor(journal, 'bod', undefined, 'b'))).toEqual(['b', 'c'])
  })
})
