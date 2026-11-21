import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { closeDb } from '../db'
import { buildRevisionBundle, decodeBundle, encodeBundle, type RevisionBundle } from '../character/share'
import { attachRecipes, importRecipes, recipeIdsOf, remapBundle } from './exchange'
import { sealRecipe } from './model'
import { getRecipe, listRecipes, putRecipe } from './store'

const spell = { kind: 'kouzlo' as const, name: 'Ohnivá střela', description: 'Blesk.', params: { obor: 'Magie ohně' } }

const bundleWith = (recipeId: string): RevisionBundle => ({
  v: 1,
  type: 'revize',
  char: 'c1',
  name: 'Hrdina',
  base: null,
  revisions: [
    {
      id: 'r1',
      at: '2026-11-21T10:00:00.000Z',
      by: 'hráč',
      note: 'Nové kouzlo',
      events: [
        { id: 'e1', path: 'recipeLinks.l1', value: { recipeId, state: { zdroje: 1 } } },
        { id: 'e2', path: 'name', value: 'Hrdina' },
      ],
    },
  ],
})

beforeEach(async () => {
  await closeDb()
  globalThis.indexedDB = new IDBFactory()
})

describe('přiložení a přepsání odkazů (čisté funkce)', () => {
  it('najde ID předpisů jen v odkazech', () => {
    expect(recipeIdsOf(bundleWith('a').revisions[0].events)).toEqual(['a'])
    expect(recipeIdsOf([{ path: 'name', value: { recipeId: 'x' } }])).toEqual([])
  })

  it('přiloží jen použité předpisy, bez otisku a času', async () => {
    const used = await sealRecipe('a', spell)
    const other = await sealRecipe('b', { ...spell, name: 'Jiné' })
    const b = attachRecipes(bundleWith('a'), [used, other])
    expect(b.recipes).toEqual([{ id: 'a', kind: 'kouzlo', name: 'Ohnivá střela', description: 'Blesk.', params: { obor: 'Magie ohně' } }])
    expect(attachRecipes(bundleWith('zmizel'), [used]).recipes).toBeUndefined()
  })

  it('přepíše ID v odkazech a nic jiného', () => {
    const b = remapBundle(bundleWith('a'), { a: 'moje' })
    expect(b.revisions[0].events[0].value).toEqual({ recipeId: 'moje', state: { zdroje: 1 } })
    expect(b.revisions[0].events[1]).toEqual({ id: 'e2', path: 'name', value: 'Hrdina' })
    expect(remapBundle(bundleWith('a'), {}).revisions[0].events[0].value).toEqual({ recipeId: 'a', state: { zdroje: 1 } })
  })

  it('předpisy přežijí kód a očištění; cizí otisk se nepřebírá', async () => {
    const used = await sealRecipe('a', spell)
    const code = await encodeBundle(attachRecipes(bundleWith('a'), [used]))
    const { bundle, errors } = await decodeBundle(code)
    expect(errors).toEqual([])
    expect(bundle?.type === 'revize' && bundle.recipes).toEqual([
      { id: 'a', kind: 'kouzlo', name: 'Ohnivá střela', description: 'Blesk.', params: { obor: 'Magie ohně' } },
    ])
    const tampered = await decodeBundle(
      JSON.stringify({ ...bundleWith('a'), recipes: [{ id: 'a', kind: 'kouzlo', name: 'X', contentHash: 'podvrh' }, { id: '', kind: 'kouzlo', name: 'Y' }, 5] }),
    )
    expect(tampered.bundle?.type === 'revize' && tampered.bundle.recipes).toEqual([
      { id: 'a', kind: 'kouzlo', name: 'X', description: '', params: {} },
    ])
  })

  it('buildRevisionBundle sám předpisy nepřikládá', () => {
    expect(buildRevisionBundle({ id: 'c', events: [] }, 'x').recipes).toBeUndefined()
  })
})

describe('zařazení do Grimoáru příjemce', () => {
  it('nový předpis se vloží s původním ID', async () => {
    const r = await importRecipes([{ id: 'a', ...spell }])
    expect(r.map).toEqual({ a: 'a' })
    expect(r.added).toHaveLength(1)
    expect((await getRecipe('a'))?.name).toBe('Ohnivá střela')
  })

  it('stejný obsah pod jiným ID se nezdvojí, odkaz míří na existující', async () => {
    await putRecipe(await sealRecipe('moje', spell))
    const r = await importRecipes([{ id: 'cizi', ...spell }])
    expect(r.map).toEqual({ cizi: 'moje' })
    expect(r.reused).toBe(1)
    expect(await listRecipes()).toHaveLength(1)
  })

  it('stejné ID s jiným obsahem: vloží se zvlášť s novým ID, původní zůstane', async () => {
    await putRecipe(await sealRecipe('a', spell))
    const r = await importRecipes([{ id: 'a', ...spell, description: 'Jiný popis' }])
    expect(r.conflicts).toEqual(['Ohnivá střela'])
    expect(r.map.a).not.toBe('a')
    expect((await getRecipe('a'))?.description).toBe('Blesk.')
    expect((await getRecipe(r.map.a))?.description).toBe('Jiný popis')
    expect(await listRecipes()).toHaveLength(2)
  })

  it('dvě totožná kouzla v jednom balíčku se po vložení slijí', async () => {
    const r = await importRecipes([{ id: 'a', ...spell }, { id: 'b', ...spell }])
    expect(r.map).toEqual({ a: 'a', b: 'a' })
    expect(await listRecipes()).toHaveLength(1)
  })
})
