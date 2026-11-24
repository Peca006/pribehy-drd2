import { describe, expect, it } from 'vitest'
import { emptyCharacter, eventsFor, type CharacterLog } from '../character/model'
import { hintsOf } from './inspiration'

const log = (id: string, c: Partial<ReturnType<typeof emptyCharacter>>): CharacterLog => ({
  id,
  events: eventsFor(emptyCharacter(id), { ...emptyCharacter(id), ...c }, 'T', 'x'),
})

describe('podněty z postav družiny', () => {
  it('vezme koncept, povahu, příběh a Jizvy členů s postavou na zařízení, ostatní vynechá', () => {
    const party = {
      members: [
        { id: 'a', name: 'Hráč A', characterId: 'c1' },
        { id: 'b', name: 'Hráč B' },
        { id: 'c', name: 'Hráč C', characterId: 'c3' },
        { id: 'd', name: 'Hráč D', characterId: 'chybi' },
      ],
    }
    const logs = new Map([
      ['c1', log('c1', { name: 'Brokan', concept: 'Strážce stezek', trait: 'rys:kodex', heroStory: 'Hlídal karavany.', scars: [{ id: 's', attribute: 'Tělo', severity: 1, note: 'zlomená ruka' }] })],
      ['c3', log('c3', { name: 'Prázdná' })],
    ])
    const hints = hintsOf(party, logs)
    expect(hints).toHaveLength(1)
    expect(hints[0]).toEqual({
      memberName: 'Hráč A',
      name: 'Brokan',
      concept: 'Strážce stezek',
      trait: 'rys:kodex',
      heroStory: 'Hlídal karavany.',
      scars: ['zlomená ruka'],
    })
  })
})
