import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { closeDb } from '../db'
import { addNpc, castNpc, togglePick } from './cast'
import {
  assignExpedition,
  emptyAdventure,
  emptyExpedition,
  emptyRun,
  expeditionsOf,
  move,
  standalone,
} from './model'
import {
  getAdventure,
  getExpedition,
  listAdventures,
  listExpeditions,
  removeAdventure,
  removeAdventureNpc,
  removeExpedition,
  saveAdventure,
  saveExpedition,
  saveExpeditionIn,
  saveRun,
} from './store'

beforeEach(async () => {
  await closeDb()
  globalThis.indexedDB = new IDBFactory()
})

describe('model výprav', () => {
  it('výpravy dobrodružství v pořadí, neznámá ID se přeskočí', () => {
    const a = { ...emptyAdventure('Bílý hrad'), expeditionIds: ['b', 'x', 'a'] }
    const all = [{ ...emptyExpedition('A'), id: 'a' }, { ...emptyExpedition('B'), id: 'b' }]
    expect(expeditionsOf(a, all).map((e) => e.id)).toEqual(['b', 'a'])
    expect(standalone(all, [{ ...a, expeditionIds: ['a'] }]).map((e) => e.id)).toEqual(['b'])
  })

  it('zařazení výpravy do jiného dobrodružství ji z původního vyřadí', () => {
    const a1 = { ...emptyAdventure('1'), id: 'a1', expeditionIds: ['e'] }
    const a2 = { ...emptyAdventure('2'), id: 'a2' }
    const e = { ...emptyExpedition('E', 'a1'), id: 'e' }
    const r = assignExpedition(e, a2, [a1, a2])
    expect(r.expedition.adventureId).toBe('a2')
    expect(r.adventures.map((a) => [a.id, a.expeditionIds])).toEqual([
      ['a1', []],
      ['a2', ['e']],
    ])
    const out = assignExpedition(r.expedition, undefined, [{ ...a1, expeditionIds: [] }, { ...a2, expeditionIds: ['e'] }])
    expect('adventureId' in out.expedition).toBe(false)
    expect(out.adventures.map((a) => a.id)).toEqual(['a2'])
  })

  it('přesun v seznamu nepřeteče přes okraje', () => {
    expect(move([1, 2, 3], 0, -1)).toEqual([1, 2, 3])
    expect(move([1, 2, 3], 0, 1)).toEqual([2, 1, 3])
    expect(move([1, 2, 3], 2, 1)).toEqual([1, 2, 3])
  })
})

describe('úložiště výprav', () => {
  it('uloží a přečte dobrodružství, výpravu i vedení', async () => {
    const e = emptyExpedition('Mlhovec')
    await saveExpedition(e)
    expect((await getExpedition(e.id))?.name).toBe('Mlhovec')
    expect((await getExpedition(e.id))?.style).toBe('domino')
  })

  it('saveExpeditionIn drží seznam dobrodružství a odkaz ve shodě', async () => {
    const a = emptyAdventure('Bílý hrad')
    await saveAdventure(a)
    const e = emptyExpedition('Cesta')
    await saveExpeditionIn(e, a.id)
    expect((await getAdventure(a.id))?.expeditionIds).toEqual([e.id])
    expect((await getExpedition(e.id))?.adventureId).toBe(a.id)
    await saveExpeditionIn(e, undefined)
    expect((await getAdventure(a.id))?.expeditionIds).toEqual([])
    expect((await getExpedition(e.id))?.adventureId).toBeUndefined()
  })

  it('výprava s vedením se nesmaže, jinak ano a zmizí i z dobrodružství', async () => {
    const a = emptyAdventure('A')
    await saveAdventure(a)
    const e = emptyExpedition('E')
    await saveExpeditionIn(e, a.id)
    await saveRun(emptyRun('Vlci', 'party1', e.id))
    expect(await removeExpedition(e.id)).toEqual({ deleted: false, runs: 1 })
    expect(await getExpedition(e.id)).toBeDefined()

    const f = emptyExpedition('F')
    await saveExpeditionIn(f, a.id)
    expect((await removeExpedition(f.id)).deleted).toBe(true)
    expect((await getAdventure(a.id))?.expeditionIds).toEqual([e.id])
  })

  it('smazání dobrodružství nechá výpravy samostatné', async () => {
    const a = emptyAdventure('A')
    await saveAdventure(a)
    const e = emptyExpedition('E')
    await saveExpeditionIn(e, a.id)
    await removeAdventure(a.id)
    expect(await listAdventures()).toHaveLength(0)
    const left = await listExpeditions()
    expect(left).toHaveLength(1)
    expect(left[0].adventureId).toBeUndefined()
  })
})

describe('cizí postavy dobrodružství', () => {
  it('smazání postavy ji odebere z dobrodružství, výběru výprav a odkazů v příhodách', async () => {
    const adv = { ...emptyAdventure('Hrad'), cast: addNpc(addNpc(undefined, 'Hubert'), 'Jarka') }
    const [hubert, jarka] = adv.cast
    await saveAdventure(adv)
    let e = togglePick(togglePick(emptyExpedition('Cesta', adv.id), hubert.id), jarka.id)
    e = {
      ...e,
      incidents: [
        { id: 'i1', title: 'A', text: '', stage: 'kdykoli', cast: [], conditions: '', ifSuccess: '', ifFailure: '' },
      ],
    }
    e.incidents[0] = castNpc(e.incidents[0], hubert)
    await saveExpeditionIn(e, adv.id)
    const other = await saveExpeditionIn(togglePick(emptyExpedition('Jiná'), hubert.id), undefined)

    await removeAdventureNpc(adv.id, hubert.id)
    expect((await getAdventure(adv.id))!.cast!.map((n) => n.name)).toEqual(['Jarka'])
    const saved = (await getExpedition(e.id))!
    expect(saved.castIds).toEqual([jarka.id])
    expect(saved.incidents[0].cast).toEqual([{ name: 'Hubert' }])
    // výpravy mimo dobrodružství se nedotknou
    expect((await getExpedition(other.id))!.castIds).toEqual([hubert.id])
  })
})
