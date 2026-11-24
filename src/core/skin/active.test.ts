import { describe, expect, it } from 'vitest'
import { darkTheme, lightTheme } from '../../themes/default'
import {
  BUILTIN_CHOICES,
  effectiveViewport,
  isBuiltinChoice,
  pickTheme,
  previewChoiceFromSearch,
  SYSTEM_CHOICE,
} from './active'
import { classifyViewport, validateSkin } from './skin'

const phone = classifyViewport(360, 800)
const desktop = classifyViewport(1280, 800)

const noc = validateSkin({
  schema: 1,
  id: 'nocni',
  name: 'Noc',
  version: '1.0.0',
  author: 'T',
  license: 'CC0-1.0',
  scheme: 'dark',
  tokens: { '--drd-accent': '#ff9900' },
  variants: [{ when: { width: 'compact' }, tokens: { '--drd-gap': '0.5rem' } }],
}).skin!

describe('pickTheme', () => {
  it('„podle systému“ vybere světlý nebo tmavý skin podle schématu', () => {
    expect(pickTheme(SYSTEM_CHOICE, [], 'light', phone)).toBe(lightTheme)
    expect(pickTheme(SYSTEM_CHOICE, [], 'dark', phone)).toBe(darkTheme)
  })

  it('výslovná volba výchozího skinu ignoruje systémové schéma', () => {
    expect(pickTheme('default-dark', [], 'light', phone)).toBe(darkTheme)
    expect(pickTheme('default-light', [], 'dark', phone)).toBe(lightTheme)
  })

  it('nainstalovaný Háv se použije a řídí se viewportem', () => {
    const onPhone = pickTheme('nocni', [noc], 'light', phone)
    expect(onPhone).toMatchObject({ id: 'nocni', scheme: 'dark' })
    expect(onPhone.tokens['--drd-gap']).toBe('0.5rem')
    expect(onPhone.tokens['--drd-accent']).toBe('#ff9900')
    expect(pickTheme('nocni', [noc], 'light', desktop).tokens['--drd-gap']).toBe(
      darkTheme.tokens['--drd-gap'],
    )
  })

  it('smazaný či neznámý Háv spadne na vzhled podle systému', () => {
    expect(pickTheme('nocni', [], 'light', phone)).toBe(lightTheme)
    expect(pickTheme('neznamy', [noc], 'dark', phone)).toBe(darkTheme)
  })

  it('id Hávu nesmí zastínit vestavěnou volbu (hlídá validace)', () => {
    for (const id of BUILTIN_CHOICES.map((c) => c.id)) {
      expect(
        validateSkin({
          schema: 1,
          id,
          name: 'x',
          version: '1.0.0',
          author: 'x',
          license: 'x',
          scheme: 'dark',
        }).ok,
      ).toBe(false)
    }
  })
})

describe('effectiveViewport (klávesnice na telefonu)', () => {
  const portrait = classifyViewport(360, 800)
  const squeezed = classifyViewport(360, 300) // vysunutá klávesnice: výška klesla, okno vypadá „na šířku“ a „nízké“

  it('při psaní ponechá orientaci a nízký viewport z minula', () => {
    expect(squeezed).toMatchObject({ orientation: 'landscape', low: true })
    expect(effectiveViewport(squeezed, portrait, true)).toEqual(portrait)
  })

  it('šířku bere vždy z měření (otočení tabletu při psaní změní třídu šířky)', () => {
    expect(effectiveViewport(classifyViewport(900, 300), portrait, true)).toMatchObject({
      width: 'medium',
      orientation: 'portrait',
      low: false,
    })
  })

  it('mimo psaní, nebo bez předchozího stavu, platí měření', () => {
    expect(effectiveViewport(squeezed, portrait, false)).toBe(squeezed)
    expect(effectiveViewport(squeezed, null, true)).toBe(squeezed)
  })
})

describe('previewChoiceFromSearch', () => {
  it('přečte volbu z adresy', () => {
    expect(previewChoiceFromSearch('?hav=nocni')).toBe('nocni')
    expect(previewChoiceFromSearch('?a=1&hav=default-dark')).toBe('default-dark')
  })
  it.each([
    '',
    '?',
    '?hav=',
    '?hav=Noc',
    '?hav=a b',
    '?hav=../x',
    `?hav=${'a'.repeat(41)}`,
    '?other=noc',
  ])('neplatné %j dá null', (s) => expect(previewChoiceFromSearch(s)).toBeNull())
})

describe('vestavěné volby', () => {
  it('jsou to systém, dva výchozí skiny a tři vestavěné Hávy, a lze je rozpoznat', () => {
    expect(BUILTIN_CHOICES.map((c) => c.id)).toEqual([
      'system',
      'default-light',
      'default-dark',
      'pergamen',
      'noc',
      'podzemi',
    ])
    for (const id of ['system', 'pergamen', 'noc', 'podzemi'])
      expect(isBuiltinChoice(id)).toBe(true)
    expect(isBuiltinChoice('nocni')).toBe(false)
  })

  it('vestavěný Háv se použije bez instalace a řídí se viewportem', () => {
    const p = pickTheme('podzemi', [], 'light', classifyViewport(360, 800))
    expect(p).toMatchObject({ id: 'podzemi', scheme: 'dark' })
    expect(p.tokens['--drd-gap']).toBe('0.75rem') // úzký viewport
    expect(pickTheme('podzemi', [], 'light', classifyViewport(1280, 800)).tokens['--drd-gap']).toBe(
      '1rem',
    )
    // telefon na šířku (nízký): pozdější varianta přepíše úzkou
    expect(
      pickTheme('podzemi', [], 'light', { width: 'compact', orientation: 'landscape', low: true })
        .tokens['--drd-gap'],
    ).toBe('0.5rem')
  })

  it('Háv ze souboru nemůže zastínit vestavěný', () => {
    const fake = { ...noc, id: 'pergamen', name: 'Podvrh' }
    expect(pickTheme('pergamen', [fake], 'dark', phone).name).toBe('Pergamen')
  })
})
