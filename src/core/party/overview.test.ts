import { describe, expect, it } from 'vitest'
import { emptyCharacter, type CharacterLog } from '../character/model'
import { partyOverview } from './overview'

const log = (id: string, patch: object): CharacterLog => {
  const c = { ...emptyCharacter(id), ...patch }
  return {
    id,
    events: Object.entries(c)
      .filter(([k]) => k !== 'id')
      .map(([path, value], i) => ({ id: `e${i}`, at: '2026-01-01', by: 'x', path, value })),
  }
}

describe('partyOverview', () => {
  it('bere jen členy s místní postavou a počítá jizvy', () => {
    const logs = [
      log('c1', {
        name: 'Aela',
        attributes: { Tělo: 3, Duše: 1, Vliv: 0 },
        professions: { bojovnik: 2, kouzelnik: 0 },
        scars: [{ id: 's', attribute: 'Tělo', severity: 1, note: 'rána' }],
        xp: 5,
      }),
    ]
    const rows = partyOverview(
      [
        { id: 'm1', name: 'Petr', characterId: 'c1' },
        { id: 'm2', name: 'Jana' },
      ],
      logs,
      (id) => id.toUpperCase(),
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe('Aela')
    expect(rows[0].attributes.Tělo).toBe(2)
    expect(rows[0].reduced).toEqual(['Tělo'])
    expect(rows[0].professions).toEqual(['BOJOVNIK 2'])
    expect(rows[0].scars).toEqual(['Tělo −1 (rána)'])
    expect(rows[0].xp).toBe(5)
  })
})
