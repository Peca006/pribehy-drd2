import { describe, expect, it } from 'vitest'
import { applyOverlays } from './overlay'
import type { ContentPack, Overlay } from './schema'

const base: ContentPack = {
  manifest: {
    format: 1,
    id: 'zaklad',
    name: 'z',
    version: '1',
    source: { book: 'x', edition: '1' },
  },
  professions: [
    {
      id: 'povolani:a',
      name: 'A',
      kind: 'mistrovske',
      intro: '',
      skills: [],
      abilities: [
        { id: 'schopnost:a/s1', name: 'S1', text: 'původní' },
        { id: 'schopnost:a/s2', name: 'S2', text: 'zrušit' },
      ],
    },
  ],
}
const ov = (patches: Overlay['patches'], appliesTo = ['zaklad']): Overlay => ({
  format: 1,
  id: 'ov',
  name: 'o',
  version: '1',
  appliesTo,
  origin: 'test',
  patches,
})

describe('applyOverlays', () => {
  it('nahradí, přidá i odstraní položky a nemění vstup', () => {
    const { pack, errors } = applyOverlays(base, [
      ov([
        { op: 'replace', target: 'schopnost:a/s1', fields: { text: 'nové' } },
        { op: 'remove', target: 'schopnost:a/s2' },
        {
          op: 'add',
          parent: 'povolani:a',
          collection: 'abilities',
          item: { id: 'schopnost:a/s3', name: 'S3', text: 'přidáno' },
        },
      ]),
    ])
    expect(errors).toEqual([])
    expect(pack.professions[0].abilities.map((a) => [a.id, a.text])).toEqual([
      ['schopnost:a/s1', 'nové'],
      ['schopnost:a/s3', 'přidáno'],
    ])
    expect(base.professions[0].abilities[0].text).toBe('původní')
  })
  it('hlásí neznámý cíl a nesprávný balíček', () => {
    expect(
      applyOverlays(base, [ov([{ op: 'remove', target: 'schopnost:a/nic' }])]).errors,
    ).toHaveLength(1)
    expect(applyOverlays(base, [ov([], ['jiny'])]).errors).toHaveLength(1)
  })
})
