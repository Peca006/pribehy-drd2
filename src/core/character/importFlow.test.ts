import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { closeDb } from '../db'
import { listRecipes } from '../recipes/store'
import { acceptRevisions, decisionOf, incomingSteps, KIND_TEXT, recipeImportNote, revertRejectedRevisions } from './importFlow'
import { characterOf } from './model'
import { analyzeImport, type RevisionBundle } from './share'
import { getLog } from './store'

const ev = (id: string, path: string, value: unknown) => ({ id, path, value })
const bundle = (): RevisionBundle => ({
  v: 1,
  type: 'revize',
  char: 'c1',
  name: 'Hrdina',
  base: null,
  revisions: [
    { id: 'r1', at: '2026-11-01T10:00:00.000Z', by: 'P', note: 'jméno', events: [ev('e1', 'name', 'Hrdina')] },
    { id: 'r2', at: '2026-11-01T11:00:00.000Z', by: 'P', note: 'zkušenosti', events: [ev('e2', 'xp', 7)] },
  ],
})

beforeEach(async () => {
  await closeDb()
  globalThis.indexedDB = new IDBFactory()
})

describe('průběh importu', () => {
  it('rozdělí revize podle zaškrtnutí a popíše druh importu', () => {
    const a = analyzeImport(undefined, bundle())
    expect(KIND_TEXT[a.kind]).toContain('nová')
    expect(decisionOf(a, { r1: true, r2: false })).toEqual({ accepted: ['r1'], rejected: ['r2'] })
  })

  it('změny revizí se skládají v pořadí a každá ukazuje stav před a po', () => {
    const b = bundle()
    const steps = incomingSteps(undefined, b, analyzeImport(undefined, b))
    expect(steps.map((s) => s.r.id)).toEqual(['r1', 'r2'])
    expect(steps[0].before).toBeUndefined()
    expect(steps[0].after.name).toBe('Hrdina')
    expect(steps[1].before?.name).toBe('Hrdina')
    expect(steps[1].after.xp).toBe(7)
  })

  it('přijetí uloží jen vybrané revize; předpisy zařadí do Grimoáru a opraví odkazy', async () => {
    const b = bundle()
    expect(await acceptRevisions(undefined, b, ['r1'])).toBe('')
    expect(characterOf((await getLog('c1'))!).name).toBe('Hrdina')
    expect(characterOf((await getLog('c1'))!).xp).toBe(0)

    const withRecipe: RevisionBundle = {
      ...bundle(),
      char: 'c2',
      revisions: [
        {
          id: 'r9',
          at: '2026-11-02T10:00:00.000Z',
          by: 'P',
          note: 'výrobek',
          events: [ev('e9', 'recipeLinks.l1', { recipeId: 'x', state: { count: 2 } })],
        },
      ],
      recipes: [{ id: 'x', kind: 'vyrobek', name: 'Lano', description: '', params: {} }],
    }
    const msg = await acceptRevisions(undefined, withRecipe, ['r9'])
    expect(msg).toContain('přidáno 1')
    expect(await listRecipes()).toHaveLength(1)
    expect(await getLog('c2')).toBeDefined()
  })

  it('zpráva o předpisech uvádí konflikty', () => {
    expect(recipeImportNote({ map: {}, added: [], reused: 2, conflicts: ['Lano'] })).toContain('Lano')
  })

  it('vrácení zamítnuté revize se zapíše do deníku', async () => {
    await acceptRevisions(undefined, bundle(), ['r1', 'r2'])
    const log = (await getLog('c1'))!
    const after = await revertRejectedRevisions(log, ['r2'], 'Hráč')
    expect(characterOf(after).xp).toBe(0)
    expect(characterOf(after).name).toBe('Hrdina')
  })
})
