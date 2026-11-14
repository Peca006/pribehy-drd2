import { beforeEach, describe, expect, it, vi } from 'vitest'

const logs: unknown[] = []
const parties: unknown[] = []
vi.mock('./character/store', () => ({
  listLogs: async () => logs,
  saveLog: async (l: unknown) => void logs.push(l),
}))
vi.mock('./party/store', () => ({
  listParties: async () => parties,
  saveParty: async (p: unknown) => void parties.push(p),
}))

const store = new Map<string, string>()
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
} as Storage

const { restoreDemo, seedDemoOnce } = await import('./demo')

beforeEach(() => {
  logs.length = 0
  parties.length = 0
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
  })
})
