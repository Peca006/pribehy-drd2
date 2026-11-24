import { describe, expect, it } from 'vitest'
import { readSkinFile, writeSkinFile } from '../core/skin/file'
import {
  contrastIssues,
  resolveTokens,
  ALL_VIEWPORTS,
  RESERVED_IDS,
  validateSkin,
} from '../core/skin/skin'
import { contrastRatio, parseColor } from '../core/skin/color'
import { TOKEN_NAMES } from '../core/skin/tokens'
import { BUILTIN_SKINS } from './havy'

describe('vestavěné Hávy', () => {
  it('jsou tři a jejich id jsou vyhrazená, aby je Háv ze souboru nemohl zastínit', () => {
    expect(BUILTIN_SKINS.map((s) => s.id)).toEqual(['pergamen', 'noc', 'podzemi'])
    for (const s of BUILTIN_SKINS) expect(RESERVED_IDS).toContain(s.id)
  })

  it.each(BUILTIN_SKINS.map((s) => [s.name, s] as const))(
    '%s: kontrast splňuje 4,5:1 bez varování na všech viewportech',
    (_name, skin) => {
      expect(contrastIssues(skin)).toEqual([])
    },
  )

  it.each(BUILTIN_SKINS.map((s) => [s.name, s] as const))(
    '%s: nastavuje úplnou sadu tokenů a každý token má platnou hodnotu',
    (_name, skin) => {
      for (const viewport of ALL_VIEWPORTS) {
        const t = resolveTokens(skin, viewport)
        for (const name of TOKEN_NAMES) expect(t[name], name).toBeTruthy()
      }
    },
  )

  it.each(BUILTIN_SKINS.map((s) => [s.name, s] as const))(
    '%s: text na plochách má vysoký kontrast (aspoň 7:1, úroveň AAA)',
    (_name, skin) => {
      const t = resolveTokens(skin, ALL_VIEWPORTS[0]!)
      for (const bg of ['--drd-bg', '--drd-surface'] as const) {
        const ratio = contrastRatio(parseColor(t['--drd-text'])!, parseColor(t[bg])!)
        expect(ratio, `${skin.id}: text na ${bg}`).toBeGreaterThanOrEqual(7)
      }
    },
  )

  it('mají různé názvy a schéma odpovídá světlosti pozadí', () => {
    expect(new Set(BUILTIN_SKINS.map((s) => s.name)).size).toBe(BUILTIN_SKINS.length)
    for (const s of BUILTIN_SKINS) {
      const bg = parseColor(resolveTokens(s, ALL_VIEWPORTS[0]!)['--drd-bg'])!
      const light = (bg.r + bg.g + bg.b) / 3 > 128
      expect(s.scheme, s.id).toBe(light ? 'light' : 'dark')
    }
  })

  it('Podzemí má ostré hrany a tvrdý stín (retro vzhled)', () => {
    const p = BUILTIN_SKINS.find((s) => s.id === 'podzemi')!
    const t = resolveTokens(p, ALL_VIEWPORTS[0]!)
    expect(t['--drd-radius']).toBe('0px')
    expect(t['--drd-shadow']).toMatch(/^\d+px \d+px 0 /) // žádné rozostření
  })

  it('exportovaný Háv jde přečíst, ale s vyhrazeným id ho import odmítne s nápovědou, co změnit', async () => {
    for (const skin of BUILTIN_SKINS) {
      const back = await readSkinFile(await writeSkinFile(skin))
      expect(back.ok).toBe(false)
      expect(back.issues).toContainEqual(
        expect.objectContaining({
          level: 'error',
          path: 'id',
          message: expect.stringContaining('jiné id'),
        }),
      )
      // po změně id je to platný Háv se stejným vzhledem
      const renamed = validateSkin({ ...skin, id: `${skin.id}-moje` })
      expect(renamed.ok, skin.id).toBe(true)
      expect(renamed.issues).toEqual([])
    }
  })
})
