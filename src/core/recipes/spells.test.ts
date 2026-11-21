import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../character/model'
import { sealRecipe } from './model'
import { KNOWN_FIELDS, addLink, emptySpell, linkedRecipes, removeLink, spellCost, spellFrom, spellIntent, spellSummary, spellToParams, usedBy } from './spells'

describe('cena kouzla', () => {
  it('základní kouzlo nestojí nic', () => {
    expect(spellCost(emptySpell())).toEqual({ zdroje: 0, suroviny: 0, lines: ['základní kouzlo nestojí nic'] })
  })
  it('náročné stojí 1 Zdroj, aktivace a substance se přičtou', () => {
    const c = spellCost({ ...emptySpell(), narocne: true, aktivace: 2, suroviny: 3 })
    expect(c.zdroje).toBe(3)
    expect(c.suroviny).toBe(3)
    expect(c.lines).toEqual(['+1 Zdroj náročné kouzlo', '+2 Zdroje aktivace schopnosti', '3 Surovin substance'])
  })
})

describe('parametry kouzla', () => {
  it('převod tam a zpět zachová hodnoty a vynechá výchozí', () => {
    const s = { ...emptySpell(), obor: ' Magie ohně ', gesta: true, dosah: 'dohled', narocne: true, aktivace: 1 }
    const p = spellToParams(s)
    expect(p).toEqual({ obor: 'Magie ohně', gesta: true, dosah: 'dohled', narocne: true, aktivace: 1 })
    expect(spellFrom(p)).toEqual({ ...s, obor: 'Magie ohně' })
  })
  it('neplatné hodnoty se zahodí', () => {
    expect(spellFrom({ dosah: 'daleko', aktivace: -4, suroviny: 1e9, zvuky: 'ano' })).toEqual({
      ...emptySpell(),
      suroviny: 99,
    })
    expect(spellFrom(undefined)).toEqual(emptySpell())
  })
  it('souhrn a záměr zkoušky', () => {
    const s = { ...emptySpell(), obor: 'Magie vody', dosah: 'dotyk', narocne: true }
    expect(spellSummary('Mlha', s)).toBe('Mlha · Magie vody · Dotyk · 1 Zdroje')
    expect(spellSummary('', emptySpell())).toBe('Kouzlo · Neurčeno')
    expect(spellIntent('Mlha', s)).toBe('Kouzlo: Mlha · Magie vody · Dotyk · 1 Zdroje')
    expect(spellIntent('', s)).toBe('Kouzlo ad hoc: Magie vody · Dotyk · 1 Zdroje')
  })
})

describe('odkazy postavy na kouzla', () => {
  it('přidá, odmítne duplicitu a odebere', () => {
    const c = emptyCharacter('c')
    const a = addLink(c, 'r1', 'l1')
    expect('character' in a && a.character.recipeLinks).toEqual({ l1: { recipeId: 'r1', state: {} } })
    if (!('character' in a)) throw new Error()
    expect(addLink(a.character, 'r1', 'l2')).toEqual({ error: 'Postava už toto kouzlo má.' })
    const r = removeLink(a.character, 'l1')
    expect('character' in r && r.character.recipeLinks).toEqual({})
    expect(removeLink(c, 'x')).toEqual({ error: 'Odkaz neexistuje.' })
    const own = addLink(c, 'r2', 'l9', true)
    expect('character' in own && own.character.recipeLinks.l9).toEqual({ recipeId: 'r2', state: { vlastniObor: 1 } })
  })
  it('spojí odkazy s předpisy a seřadí podle názvu; chybějící předpis jde na konec', async () => {
    const mlha = await sealRecipe('r1', { kind: 'kouzlo', name: 'Mlha' })
    const ahoj = await sealRecipe('r2', { kind: 'kouzlo', name: 'Ahoj' })
    const c = {
      ...emptyCharacter('c'),
      recipeLinks: { a: { recipeId: 'r1', state: {} }, b: { recipeId: 'zmizel', state: {} }, c: { recipeId: 'r2', state: {} } },
    }
    expect(linkedRecipes(c, [mlha, ahoj]).map((x) => x.recipeId)).toEqual(['r2', 'r1', 'zmizel'])
  })
})

describe('použití předpisu', () => {
  it('najde postavy s odkazem a zná všechny obory', () => {
    const a = { ...emptyCharacter('a'), recipeLinks: { l: { recipeId: 'r1', state: {} } } }
    const b = emptyCharacter('b')
    expect(usedBy('r1', [a, b]).map((c) => c.id)).toEqual(['a'])
    expect(usedBy('r2', [a, b])).toEqual([])
    expect(KNOWN_FIELDS).toContain('Magie ohně')
    expect(new Set(KNOWN_FIELDS).size).toBe(KNOWN_FIELDS.length)
  })
})
