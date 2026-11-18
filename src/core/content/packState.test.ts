import { describe, expect, it } from 'vitest'
import { EXPECTED_BUILD } from './builds'
import { packState } from './packState'
import type { CatalogEntry } from './remote'
import type { ContentPack } from './schema'

const need = EXPECTED_BUILD['drd2-pravidla-2']
const inst = (version: string, build?: number, id = 'drd2-pravidla-2') =>
  ({ manifest: { id, version, build } }) as unknown as ContentPack
const entry = (version: string, build: number): CatalogEntry => ({
  id: 'drd2-pravidla-2',
  name: 'x',
  version,
  build,
  file: 'x.json',
  size: 1,
  sha256: '',
})

describe('stav balíčku', () => {
  it('chybí', () => {
    expect(packState(entry('2.0.0', need), undefined)).toBe('missing')
    expect(packState(undefined, undefined)).toBe('missing')
  })
  it('starší sestavení, než aplikace potřebuje, je zastaralé (i bez katalogu)', () => {
    expect(packState(undefined, inst('2.0.0', need - 1))).toBe('outdated')
    expect(packState(entry('2.0.0', need), inst('2.0.0'))).toBe('outdated')
  })
  it('novější verze v katalogu je aktualizace', () => {
    expect(packState(entry('2.1.0', need), inst('2.0.0', need))).toBe('update')
  })
  it('jinak je v pořádku; cizí balíček se nehlídá', () => {
    expect(packState(entry('2.0.0', need), inst('2.0.0', need))).toBe('ok')
    expect(packState(undefined, inst('2.0.0', need))).toBe('ok')
    expect(packState(undefined, inst('1', 0, 'vlastni'))).toBe('ok')
  })
})
