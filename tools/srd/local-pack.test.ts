import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { validatePack } from '../../src/core/content/validate'
import type { ContentPack } from '../../src/core/content/schema'

// Běží jen na stroji, kde byl balíček lokálně vygenerován (`npm run build:srd`); jinak se přeskočí.
const file = 'content-packs/local/drd2-pravidla-2.json'
describe.skipIf(!existsSync(file))('lokální balíček SRD', () => {
  it('je platný a má 15 povolání po 12 schopnostech', () => {
    const pack: ContentPack = JSON.parse(readFileSync(file, 'utf8'))
    expect(validatePack(pack)).toEqual([])
    expect(pack.professions).toHaveLength(15)
    expect(pack.professions.every((p) => p.abilities.length === 12)).toBe(true)
  })
})
