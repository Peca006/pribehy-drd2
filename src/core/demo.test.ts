import { beforeEach, describe, expect, it, vi } from 'vitest'

const logs: unknown[] = []
const parties: unknown[] = []
vi.mock('./character/store', () => ({
  listLogs: async () => [...logs],
  saveLog: async (l: unknown) => void logs.push(l),
  deleteLog: async (id: string) => {
    const i = logs.findIndex((l) => (l as { id: string }).id === id)
    if (i >= 0) logs.splice(i, 1)
  },
}))
vi.mock('./party/store', () => ({
  listParties: async () => [...parties],
  saveParty: async (p: unknown) => void parties.push(p),
  deleteParty: async (id: string) => {
    const i = parties.findIndex((p) => (p as { id: string }).id === id)
    if (i >= 0) parties.splice(i, 1)
  },
}))

const adventures: { id: string }[] = []
const expeditions: { id: string }[] = []
const runs: { id: string; partyId: string; expeditionId: string }[] = []
const del = (list: { id: string }[], id: string) => {
  const i = list.findIndex((x) => x.id === id)
  if (i >= 0) list.splice(i, 1)
}
vi.mock('./expedition/store', () => ({
  listAdventures: async () => [...adventures],
  saveAdventure: async (a: { id: string }) => void adventures.push(a),
  deleteAdventure: async (id: string) => del(adventures, id),
  listExpeditions: async () => [...expeditions],
  saveExpedition: async (e: { id: string }) => void expeditions.push(e),
  deleteExpedition: async (id: string) => del(expeditions, id),
  listRuns: async () => [...runs],
  deleteRun: async (id: string) => del(runs, id),
}))

const recipes: { id: string }[] = []
vi.mock('./recipes/store', () => ({
  listRecipes: async () => [...recipes],
  putRecipe: async (r: { id: string }) => {
    const i = recipes.findIndex((x) => x.id === r.id)
    if (i >= 0) recipes[i] = r
    else recipes.push(r)
    return r
  },
  removeRecipe: async (id: string) => {
    const i = recipes.findIndex((x) => x.id === id)
    if (i >= 0) recipes.splice(i, 1)
  },
}))

const store = new Map<string, string>()
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
} as Storage

const { removeDemo, restoreDemo, seedDemoOnce } = await import('./demo')

beforeEach(() => {
  logs.length = 0
  parties.length = 0
  recipes.length = 0
  adventures.length = 0
  expeditions.length = 0
  runs.length = 0
  store.clear()
})

describe('ukázková data', () => {
  it('při prvním použití do prázdné aplikace je nainstaluje, podruhé už ne', async () => {
    expect(await seedDemoOnce('Test')).toBe(true)
    expect(logs).toHaveLength(3)
    expect(parties).toHaveLength(1)
    expect(await seedDemoOnce('Test')).toBe(false)
    expect(logs).toHaveLength(3)
  })
  it('do aplikace s daty nic nepřidá', async () => {
    logs.push({})
    expect(await seedDemoOnce('Test')).toBe(false)
    expect(logs).toHaveLength(1)
    expect(await seedDemoOnce('Test')).toBe(false)
  })
  it('obnovení nahraje ukázková data znovu', async () => {
    await restoreDemo('Test')
    expect(logs).toHaveLength(3)
    expect(parties).toHaveLength(1)
    expect(recipes.length).toBeGreaterThanOrEqual(15)
    expect(adventures).toHaveLength(1)
    expect(expeditions).toHaveLength(2)
    const kinds = recipes.map((r) => (r as unknown as { kind: string }).kind)
    for (const k of ['kouzlo', 'lektvar', 'nastraha', 'vyrobek'])
      expect(kinds.filter((x) => x === k).length).toBeGreaterThanOrEqual(3)
  })
  it('odstranění smaže jen ukázková data a po něm se už nenabízejí samy', async () => {
    await restoreDemo('Test')
    logs.push({ id: 'moje-postava', events: [] })
    recipes.push({ id: 'moje-kouzlo' })
    parties.push({ id: 'moje-druzina' })
    expeditions.push({ id: 'moje-vyprava' })
    adventures.push({ id: 'moje-dobrodruzstvi' })
    runs.push({ id: 'moje-vedeni', partyId: 'moje-druzina', expeditionId: 'moje-vyprava' })
    runs.push({ id: 'vedeni-ukazky', partyId: 'demo-druzina', expeditionId: 'moje-vyprava' })
    await removeDemo()
    expect(expeditions).toEqual([{ id: 'moje-vyprava' }])
    expect(adventures).toEqual([{ id: 'moje-dobrodruzstvi' }])
    expect(runs.map((r) => r.id)).toEqual(['moje-vedeni'])
    expect(logs).toEqual([{ id: 'moje-postava', events: [] }])
    expect(parties).toEqual([{ id: 'moje-druzina' }])
    expect(recipes).toEqual([{ id: 'moje-kouzlo' }])
    logs.length = 0
    parties.length = 0
    expect(await seedDemoOnce('Test')).toBe(false)
  })
})
