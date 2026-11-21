import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { closeDb } from '../db'
import { applyChange, diffCharacter, emptyCharacter } from '../character/model'
import { canonName, canonText, cleanRecipe, linkFrom, linksFrom, recipeHash, sealRecipe } from './model'
import { planImport, sameContent, suggestRecipes, withHash } from './find'
import { getRecipe, listRecipes, removeRecipe, saveRecipe } from './store'

const spell = {
  kind: 'kouzlo' as const,
  name: 'Ohnivá střela',
  description: 'Blesk ohně z dlaně.',
  params: { obor: 'Magie ohně', dosah: 'dohled', narocne: true },
}

describe('kanonický tvar a otisk obsahu', () => {
  it('stejný obsah dá stejný otisk bez ohledu na pořadí parametrů, mezery a konce řádků', async () => {
    const a = await recipeHash(spell)
    const b = await recipeHash({
      ...spell,
      name: '  Ohnivá   střela ',
      description: 'Blesk ohně z dlaně.  \r\n',
      params: { narocne: true, dosah: 'dohled ', obor: 'Magie ohně' },
    })
    expect(b).toBe(a)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
  })

  it('Unicode: složená a rozložená diakritika dá stejný otisk', async () => {
    const composed = 'Ohnivá střela'.normalize('NFC')
    const decomposed = 'Ohnivá střela'.normalize('NFD')
    expect(await recipeHash({ ...spell, name: decomposed })).toBe(await recipeHash({ ...spell, name: composed }))
  })

  it('změna názvu, popisu, parametru nebo druhu změní otisk', async () => {
    const base = await recipeHash(spell)
    expect(await recipeHash({ ...spell, name: 'Ohnivá koule' })).not.toBe(base)
    expect(await recipeHash({ ...spell, description: 'Jiný popis' })).not.toBe(base)
    expect(await recipeHash({ ...spell, params: { ...spell.params, dosah: 'dotyk' } })).not.toBe(base)
    expect(await recipeHash({ ...spell, kind: 'lektvar' })).not.toBe(base)
  })

  it('prázdné a nepravdivé parametry jsou totéž co chybějící', async () => {
    const base = await recipeHash(spell)
    expect(await recipeHash({ ...spell, params: { ...spell.params, rozsah: '  ', zrusene: false } })).toBe(base)
  })

  it('názvy a texty se čistí', () => {
    expect(canonName(' a \n b ')).toBe('a b')
    expect(canonText('x  \r\ny\r\n')).toBe('x\ny')
    expect(canonName(5)).toBe('')
  })
})

describe('očištění vstupu', () => {
  it('předpis bez druhu nebo názvu je neplatný', () => {
    expect(cleanRecipe({ kind: 'kouzlo', name: '  ' })).toBeUndefined()
    expect(cleanRecipe({ kind: 'neznamy', name: 'x' })).toBeUndefined()
    expect(cleanRecipe(null)).toBeUndefined()
    expect(cleanRecipe({ kind: 'kouzlo', name: 'x' })).toEqual({ kind: 'kouzlo', name: 'x', description: '', params: {} })
  })

  it('parametry: jen skaláry, rozumné klíče', () => {
    const c = cleanRecipe({
      ...spell,
      params: { 'a.b': 'x', ok: 'y', obj: { z: 1 }, n: 3, inf: Infinity, '': 'x' },
    })
    expect(c?.params).toEqual({ ok: 'y', n: 3 })
  })

  it('odkaz: neplatný vstup se zahodí, stav jen čísla a texty', () => {
    expect(linkFrom({ recipeId: '' })).toBeUndefined()
    expect(linkFrom('x')).toBeUndefined()
    expect(linkFrom({ recipeId: 'r1', state: { zdroje: 2, poznamka: 'x', zle: {}, 'a.b': 1 } })).toEqual({
      recipeId: 'r1',
      state: { zdroje: 2, poznamka: 'x' },
    })
    expect(linksFrom({ l1: { recipeId: 'r1' }, 'l.2': { recipeId: 'r2' }, l3: 5 })).toEqual({
      l1: { recipeId: 'r1', state: {} },
    })
    expect(linksFrom([1, 2])).toEqual({})
  })
})

describe('porovnání a import', () => {
  it('našeptávání: bez diakritiky a velikosti písmen, začátky před vnitřními shodami', async () => {
    const list = [
      await sealRecipe('1', { kind: 'kouzlo', name: 'Šípová bouře' }),
      await sealRecipe('2', { kind: 'kouzlo', name: 'Ohnivá střela' }),
      await sealRecipe('3', { kind: 'lektvar', name: 'Střelný lektvar' }),
      await sealRecipe('4', { kind: 'kouzlo', name: 'Střela času' }),
    ]
    expect(suggestRecipes(list, 'STREL').map((r) => r.id)).toEqual(['4', '3', '2'])
    expect(suggestRecipes(list, 'strel', 'kouzlo').map((r) => r.id)).toEqual(['4', '2'])
    expect(suggestRecipes(list, 'sipo').map((r) => r.id)).toEqual(['1'])
    expect(suggestRecipes(list, '  ')).toEqual([])
    expect(suggestRecipes(list, 'str', undefined, 1)).toHaveLength(1)
  })

  it('stejný obsah se použije znovu, i když má jiné ID', async () => {
    const mine = await sealRecipe('moje', spell)
    const incoming = await sealRecipe('cizi', spell)
    expect(withHash([mine], incoming.contentHash)).toEqual([mine])
    expect(sameContent(mine, incoming)).toBe(true)
    expect(planImport([mine], incoming)).toEqual({ action: 'reuse', recipeId: 'moje' })
  })

  it('jiný obsah se vloží jako nový; stejné ID s jiným obsahem je konflikt', async () => {
    const mine = await sealRecipe('x', spell)
    const other = await sealRecipe('y', { ...spell, description: 'Jiné' })
    expect(planImport([mine], other)).toEqual({ action: 'add', conflict: false })
    const clash = await sealRecipe('x', { ...spell, description: 'Jiné' })
    expect(planImport([mine], clash)).toEqual({ action: 'add', conflict: true })
  })

  it('shodný otisk bez shodného obsahu se nepovažuje za duplicitu', async () => {
    const mine = await sealRecipe('x', spell)
    const fake = { ...(await sealRecipe('y', { ...spell, description: 'Jiné' })), contentHash: mine.contentHash }
    expect(planImport([mine], fake)).toEqual({ action: 'add', conflict: false })
  })
})

describe('úložiště předpisů', () => {
  beforeEach(async () => {
    await closeDb()
    globalThis.indexedDB = new IDBFactory()
  })

  it('uloží, přečte, upraví (stejné ID, nový otisk) a smaže', async () => {
    const a = await saveRecipe(spell)
    expect(a.contentHash).toMatch(/^[0-9a-f]{64}$/)
    expect(await getRecipe(a.id)).toEqual(a)
    const b = await saveRecipe({ ...spell, description: 'Změněno' }, a.id)
    expect(b.id).toBe(a.id)
    expect(b.contentHash).not.toBe(a.contentHash)
    expect(await listRecipes()).toHaveLength(1)
    await removeRecipe(a.id)
    expect(await listRecipes()).toEqual([])
  })

  it('otisk se nikdy nepřebírá zvenku', async () => {
    const r = await saveRecipe({ ...spell, contentHash: 'podvrh' } as never)
    expect(r.contentHash).toBe(await recipeHash(spell))
  })

  it('bez názvu nebo s neznámým ID úprava selže', async () => {
    await expect(saveRecipe({ kind: 'kouzlo', name: ' ' })).rejects.toThrow(/název/)
    await expect(saveRecipe(spell, 'neni')).rejects.toThrow(/neexistuje/)
  })
})

describe('odkazy v postavě', () => {
  it('změny odkazů se zapisují po jednom a dají se přehrát', () => {
    const before = emptyCharacter('c')
    const after = { ...before, recipeLinks: { l1: { recipeId: 'r1', state: { zdroje: 1 } } } }
    const diff = diffCharacter(before, after)
    expect(diff).toEqual([{ path: 'recipeLinks.l1', value: { recipeId: 'r1', state: { zdroje: 1 } } }])
    const replayed = diff.reduce(
      (c, d) => applyChange(c, { id: 'e', at: '', by: 'x', ...d }),
      before,
    )
    expect(replayed.recipeLinks).toEqual(after.recipeLinks)
    const removed = diffCharacter(after, before)
    expect(removed).toEqual([{ path: 'recipeLinks.l1', value: undefined }])
  })
})
