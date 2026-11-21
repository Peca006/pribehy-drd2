import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { closeDb } from '../db'
import { characterOf, type CharacterLog } from '../character/model'
import { getLog, saveLog } from '../character/store'
import type { RevisionBundle } from '../character/share'
import { listRecipes } from './store'
import { expand } from './working'
import { isLegacyPath, legacyConverter, migrateLegacyLogs, upgradeBundle } from './legacy'

const potion = { attribute: 'Tělo', scar: 'popálenina', count: 3, note: 'mast' }
const trap = {
  name: 'Jáma',
  attribute: 'Tělo',
  type: 'jednoducha',
  effect: 'jizva',
  maneuver: '',
  extra: 0,
  weakness: 'listí',
  note: '',
  count: 2,
}
const ev = (id: string, path: string, value?: unknown) => ({ id, at: '2026-11-01T10:00:00.000Z', by: 'P', path, value, note: 'x' })

beforeEach(async () => {
  await closeDb()
  globalThis.indexedDB = new IDBFactory()
})

describe('starý formát', () => {
  it('pozná cesty lektvarů a nástrah', () => {
    expect(isLegacyPath('potions.a1')).toBe(true)
    expect(isLegacyPath('traps.t')).toBe(true)
    expect(isLegacyPath('potions')).toBe(false)
    expect(isLegacyPath('recipeLinks.a')).toBe(false)
    expect(isLegacyPath('potions.a.count')).toBe(false)
  })

  it('převodník: stejný obsah = jeden předpis, změna počtu zůstane jen stavem, smazání se zachová', () => {
    const c = legacyConverter()
    const out = c.convert([
      ev('1', 'name', 'Hrdina'),
      ev('2', 'potions.p1', potion),
      ev('3', 'potions.p1', { ...potion, count: 1 }),
      ev('4', 'potions.p1'),
      ev('5', 'traps.t1', trap),
      ev('6', 'potions.p2', { attribute: 'Síla' }),
    ])
    expect(out.map((e) => e.path)).toEqual(['name', 'recipeLinks.p1', 'recipeLinks.p1', 'recipeLinks.p1', 'recipeLinks.t1'])
    expect(out[3].value).toBeUndefined()
    expect(c.recipes().map((r) => r.kind)).toEqual(['lektvar', 'nastraha'])
    expect((out[1].value as { recipeId: string }).recipeId).toBe((out[2].value as { recipeId: string }).recipeId)
    expect(out[2].value).toMatchObject({ state: { count: 1, note: 'mast' } })
  })

  it('balíček ve starém formátu se převede, nový zůstane beze změny', () => {
    const old: RevisionBundle = {
      v: 1,
      type: 'revize',
      char: 'c',
      name: 'H',
      base: null,
      revisions: [
        { id: 'r', at: '2026-11-01T10:00:00.000Z', by: 'P', note: '', events: [{ id: 'e', path: 'traps.t1', value: trap }] },
      ],
    }
    const up = upgradeBundle(old) as RevisionBundle
    expect(up.revisions[0].events[0].path).toBe('recipeLinks.t1')
    expect(up.recipes).toHaveLength(1)
    expect(up.recipes![0].name).toBe('Jáma')
    expect(upgradeBundle(up)).toBe(up)
  })

  it('deník se převede jednou, předpisy vzniknou v Grimoáru a postava má stejné lektvary a nástrahy', async () => {
    const log: CharacterLog = {
      id: 'c1',
      events: [ev('1', 'name', 'Hrdina'), ev('2', 'potions.p1', potion), ev('3', 'traps.t1', trap)],
    }
    await saveLog(log)
    expect(await migrateLegacyLogs()).toBe(1)
    const after = (await getLog('c1'))!
    expect(after.events.map((e) => e.path)).toEqual(['name', 'recipeLinks.p1', 'recipeLinks.t1'])
    expect(after.events.map((e) => e.id)).toEqual(['1', '2', '3'])
    const recipes = await listRecipes()
    expect(recipes).toHaveLength(2)
    const c = expand(characterOf(after), recipes)
    expect(c.potions.p1).toEqual(potion)
    expect(c.traps.t1).toEqual(trap)
    // podruhé není co převádět
    expect(await migrateLegacyLogs()).toBe(0)
  })

  it('dvě postavy se stejným lektvarem sdílejí jeden předpis', async () => {
    await saveLog({ id: 'a', events: [ev('1', 'potions.p1', potion)] })
    await saveLog({ id: 'b', events: [ev('2', 'potions.q9', { ...potion, count: 7 })] })
    await migrateLegacyLogs()
    expect(await listRecipes()).toHaveLength(1)
  })
})
