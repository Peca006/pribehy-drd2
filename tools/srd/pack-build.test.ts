import { describe, expect, it } from 'vitest'
import { EXPECTED_BUILD } from '../../src/core/content/builds'
// @ts-expect-error – JS modul bez typů
import { PACK_BUILD } from './pipeline.mjs'

describe('číslo sestavení balíčků', () => {
  it('požadované číslo v aplikaci odpovídá převodníku', () => {
    for (const need of Object.values(EXPECTED_BUILD)) expect(need).toBe(PACK_BUILD)
  })
})
