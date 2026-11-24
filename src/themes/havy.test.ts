import { describe, expect, it } from 'vitest'
import { readSkinFile, writeSkinFile } from '../core/skin/file'
import { inspectImage } from '../core/skin/image'
import {
  contrastIssues,
  resolveTokens,
  skinTheme,
  ALL_VIEWPORTS,
  RESERVED_IDS,
  validateSkin,
} from '../core/skin/skin'
import { contrastRatio, parseColor } from '../core/skin/color'
import { TOKEN_NAMES } from '../core/skin/tokens'
import { BUILTIN_ASSETS, BUILTIN_SKINS } from './havy'
import { gemIcon, marble } from './podzemi/art'

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
      const back = await readSkinFile(await writeSkinFile(skin, BUILTIN_ASSETS[skin.id] ?? []))
      expect(back.ok).toBe(false)
      expect(back.issues).toContainEqual(
        expect.objectContaining({
          level: 'error',
          path: 'id',
          message: expect.stringContaining('jiné id'),
        }),
      )
      // po změně id je to platný Háv se stejným vzhledem (i s obrázky)
      const renamed = validateSkin({ ...skin, id: `${skin.id}-moje` })
      expect(renamed.ok, skin.id).toBe(true)
      expect(renamed.issues).toEqual([])
      const again = await readSkinFile(
        await writeSkinFile(renamed.skin!, BUILTIN_ASSETS[skin.id] ?? []),
      )
      expect(again.ok, skin.id).toBe(true)
      expect(again.issues).toEqual([])
      expect(again.assets).toHaveLength(Object.keys(skin.assets).length)
    }
  })

  describe('obrázky vestavěných Hávů', () => {
    it('Pergamen a Noc obrázky nemají, Podzemí ano', () => {
      expect(Object.keys(BUILTIN_ASSETS)).toEqual(['podzemi'])
      for (const id of ['pergamen', 'noc'])
        expect(BUILTIN_SKINS.find((s) => s.id === id)!.assets).toEqual({})
    })

    const podzemi = () => BUILTIN_SKINS.find((s) => s.id === 'podzemi')!

    it('každý obrázek z manifestu má bajty a žádný navíc, a všechny projdou stejnou kontrolou jako cizí obrázky', () => {
      const names = Object.keys(podzemi().assets).sort()
      expect(BUILTIN_ASSETS.podzemi!.map((a) => a.name).sort()).toEqual(names)
      for (const a of BUILTIN_ASSETS.podzemi!) {
        const check = inspectImage(a.bytes)
        expect(check.ok, a.name).toBe(true)
        expect(check.ok && check.info.type, a.name).toBe('image/svg+xml')
        expect(a.type, a.name).toBe('image/svg+xml')
      }
    })

    it('používá všech šest rolí a ikony pro všechny záložky', () => {
      expect(Object.keys(podzemi().roles).sort()).toEqual([
        'background',
        'button',
        'dialog',
        'divider',
        'panel',
        'tab',
      ])
      expect(Object.keys(podzemi().icons).sort()).toEqual([
        'bestiar',
        'ctenar',
        'druziny',
        'grimoar',
        'knihovna',
        'postavy',
        'vypravy',
      ])
    })

    it('vyrobí proměnné všech rolí a embos textu', () => {
      const urls = Object.fromEntries(
        Object.keys(podzemi().assets).map((n) => [n, `blob:http://x/${n}`]),
      )
      const t = skinTheme(podzemi(), ALL_VIEWPORTS[0]!, urls).tokens
      for (const k of [
        '--drd-background-image',
        '--drd-panel-bi-source',
        '--drd-button-bi-source',
        '--drd-tab-bi-source',
        '--drd-dialog-bi-source',
        '--drd-dialog-bw',
        '--drd-divider-image',
        '--drd-text-shadow',
      ]) {
        expect(t[k as keyof typeof t], k).toBeTruthy()
      }
    })

    it('grafika je opakovatelná (stejný výstup při každém volání)', () => {
      expect(marble()).toBe(marble())
      expect(gemIcon('postavy')).toBe(gemIcon('postavy'))
    })
  })
})
