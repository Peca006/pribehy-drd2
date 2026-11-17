import { describe, expect, it } from 'vitest'
import { EXPECTED_BUILD, outdatedPacks } from './builds'
import type { ContentPack } from './schema'

const pack = (id: string, build?: number) =>
  ({ manifest: { id, build }, professions: [] }) as unknown as ContentPack
const need = EXPECTED_BUILD['drd2-pravidla-2']

describe('zastaralé balíčky', () => {
  it('zastaralý je balíček ze SRD bez čísla nebo s nižším číslem; cizí balíčky se nehlídají', () => {
    const list = [
      pack('drd2-pravidla-2'),
      pack('drd2-bestiar-2', need),
      pack('drd2-hry-mocnych-1'),
      pack('vlastni', 0),
    ]
    expect(outdatedPacks(list).map((p) => p.manifest.id)).toEqual(['drd2-pravidla-2'])
    expect(outdatedPacks([pack('drd2-pravidla-2', need + 1)])).toEqual([])
  })
})
