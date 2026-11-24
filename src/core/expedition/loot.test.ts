import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { characterOf, emptyCharacter, eventsFor } from '../character/model'
import { getLog, saveLog } from '../character/store'
import { closeDb } from '../db'
import { addLocalMember } from '../party/journal'
import { emptyParty } from '../party/model'
import { getParty, saveParty } from '../party/store'
import { journalDraft } from './closing'
import { addIncident } from './deck'
import {
  applyLoot,
  describeLoot,
  distribute,
  effective,
  emptyLoot,
  hide,
  lootLines,
  lootRows,
  problem,
  refine,
  reveal,
  stateOfLoot,
} from './loot'
import { emptyExpedition, emptyRun, type Expedition, type Loot, type Run } from './model'
import { beginRun } from './runs'
import { getRun, saveExpedition } from './store'

beforeEach(async () => {
  await closeDb()
  globalThis.indexedDB = new IDBFactory()
})

const loot = (l: Partial<Loot> & Pick<Loot, 'kind'>): Loot => ({ id: 'l1', label: '', ...l })

describe('kořist: popis a kontrola', () => {
  it('čitelný popis podle druhu', () => {
    expect(describeLoot(loot({ kind: 'penize', amount: 5, unit: 'grose' }))).toBe('5 grošů')
    expect(describeLoot(loot({ kind: 'penize', amount: 1, unit: 'halere' }))).toBe('1 haléř')
    expect(describeLoot(loot({ kind: 'penize', amount: 3, unit: 'grose' }))).toBe('3 groše')
    expect(describeLoot(loot({ kind: 'penize', amount: 2, unit: 'dukaty', label: 'pokladnice' }))).toBe('2 dukáty (pokladnice)')
    expect(describeLoot(loot({ kind: 'suroviny', amount: 3, mark: '🌿', label: 'bylina' }))).toBe('3× Suroviny 🌿 bylina')
    expect(describeLoot(loot({ kind: 'suroviny', amount: 4 }))).toBe('4× Suroviny')
    expect(describeLoot(loot({ kind: 'vybava', label: 'Runové kladivo' }))).toBe('Runové kladivo')
    expect(describeLoot(loot({ kind: 'trofej', label: 'Zub', note: 'z hlavního zlobra' }))).toBe('Trofej: Zub (z hlavního zlobra)')
  })

  it('problémy brání rozdělení', () => {
    expect(problem(loot({ kind: 'penize', amount: 0 }))).toMatch(/Množství/)
    expect(problem(loot({ kind: 'suroviny', amount: 1.5 }))).toMatch(/Množství/)
    expect(problem(loot({ kind: 'vybava', label: ' ' }))).toMatch(/název/)
    expect(problem(loot({ kind: 'trofej', label: '' }))).toMatch(/název/)
    expect(problem(loot({ kind: 'penize', amount: 3 }))).toBe('')
    expect(problem(emptyLoot('vybava'))).toMatch(/název/)
  })
})

describe('kořist: zápis do postavy', () => {
  const c = emptyCharacter('c1')

  it('peníze se přičtou do správné jednotky', () => {
    const r = applyLoot(c, loot({ kind: 'penize', amount: 7, unit: 'grose' }))
    expect('character' in r && r.character.cash).toEqual({ dukaty: 0, grose: 7, halere: 0 })
  })

  it('výbava přibude na konec, trofej postavu nemění', () => {
    const r = applyLoot({ ...c, equipment: ['Meč'] }, loot({ kind: 'vybava', label: ' Štít ' }))
    expect('character' in r && r.character.equipment).toEqual(['Meč', 'Štít'])
    const t = applyLoot(c, loot({ kind: 'trofej', label: 'Zub' }))
    expect('character' in t && t.character).toBe(c)
  })

  it('suroviny bez druhu jdou do obecných, s druhem do existujícího nebo nově vzniklého druhu', () => {
    const plain = applyLoot(c, loot({ kind: 'suroviny', amount: 3 }))
    expect('character' in plain && plain.character.rawMaterials).toBe(3)

    const first = applyLoot(c, loot({ kind: 'suroviny', amount: 2, mark: '🌿', label: 'bylina' }))
    expect('character' in first).toBe(true)
    const ch1 = (first as { character: typeof c }).character
    const kinds = Object.values(ch1.rawMaterialKinds)
    expect(kinds).toEqual([{ mark: '🌿', name: 'bylina', count: 2 }])

    const again = applyLoot(ch1, loot({ kind: 'suroviny', amount: 5, label: 'bylina' }))
    const ch2 = (again as { character: typeof c }).character
    expect(Object.values(ch2.rawMaterialKinds)).toEqual([{ mark: '🌿', name: 'bylina', count: 7 }])
    expect(ch2.rawMaterials).toBe(0)
  })

  it('chybné hodnoty vrátí chybu', () => {
    expect(applyLoot(c, loot({ kind: 'penize', amount: 0 }))).toHaveProperty('error')
  })
})

function withLoot() {
  let e: Expedition = emptyExpedition('Cesta')
  const r = addIncident(e, '')
  const l1: Loot = { id: 'L1', kind: 'penize', label: '', amount: 5, unit: 'grose' }
  const l2: Loot = { id: 'L2', kind: 'vybava', label: 'Kladivo' }
  e = { ...r.expedition, incidents: r.expedition.incidents.map((i) => ({ ...i, title: 'Zlobři', loot: [l1, l2] })) }
  return { e, run: emptyRun('x', 'p', e.id) as Run }
}

describe('kořist ve vedení', () => {
  it('skrytá, odhalená a upřesněná; rozdělenou upřesnit nejde', () => {
    const { e, run } = withLoot()
    expect(stateOfLoot(run, 'L1')).toBe('ukryta')
    expect(lootRows(e, run).map((r) => [r.base.id, r.state])).toEqual([['L1', 'ukryta'], ['L2', 'ukryta']])
    expect(refine(run, 'L1', { amount: 9 })).toBe(run)

    let r = reveal(run, 'L1')
    r = refine(r, 'L1', { amount: 9.7, note: 'v truhle' })
    expect(lootRows(e, r)[0].now).toMatchObject({ amount: 9, note: 'v truhle', unit: 'grose' })
    expect(effective(lootRows(e, r)[0].base, undefined).amount).toBe(5)

    const done: Run = { ...r, loot: { ...r.loot, L1: { ...r.loot.L1, state: 'rozdelena' } } }
    expect(refine(done, 'L1', { amount: 1 })).toBe(done)
    expect(hide(r, 'L1').loot).toEqual({})
  })

  it('řádky pro žurnál ukážou jen rozdělené a komu', () => {
    const { e, run } = withLoot()
    const party = { members: [{ id: 'm1', name: 'Brokan' }] }
    const r: Run = { ...run, loot: { L1: { state: 'rozdelena', to: 'm1' }, L2: { state: 'odhalena' } } }
    expect(lootLines(e, r, party)).toEqual(['• 5 grošů → Brokan'])
    expect(journalDraft(e, r, party).text).toContain('Kořist:\n• 5 grošů → Brokan')
  })
})

describe('rozdělení kořisti družině', () => {
  async function setup() {
    const { e } = withLoot()
    await saveExpedition(e)
    let party = emptyParty('Vlci')
    const log = { id: 'c1', events: eventsFor(emptyCharacter('c1'), { ...emptyCharacter('c1'), name: 'Brokan' }, 'Petr', 'Tvorba') }
    await saveLog(log)
    party = addLocalMember(party, 'c1', 'Brokan')
    party = { ...party, members: [...party.members, { id: 'free', name: 'Hana' }] }
    await saveParty(party)
    const run = await beginRun(e.id, party.id)
    return { e, party, run, local: party.members[0].id, free: 'free' }
  }

  it('zapíše kořist postavě na zařízení jako revizi s poznámkou a označí ji za rozdělenou', async () => {
    const { run, local } = await setup()
    const { saveRun } = await import('./store')
    await saveRun(reveal(run, 'L1'))
    const res = await distribute(run.id, 'L1', local, 'Petr')
    expect(res.applied).toBe(true)
    const ch = characterOf((await getLog('c1'))!)
    expect(ch.cash.grose).toBe(5)
    const last = (await getLog('c1'))!.events.at(-1)!
    expect(last.note).toBe('Kořist z výpravy „Cesta“: 5 grošů')
    expect((await getRun(run.id))?.loot.L1).toMatchObject({ state: 'rozdelena', to: local, applied: true })
    await expect(distribute(run.id, 'L1', local, 'Petr')).rejects.toThrow(/rozdělená/)
  })

  it('člen bez postavy v zařízení dostane jen záznam; skrytou kořist nelze rozdělit', async () => {
    const { run, free } = await setup()
    const { saveRun } = await import('./store')
    await expect(distribute(run.id, 'L2', free, 'Petr')).rejects.toThrow(/skrytá/)
    await saveRun(reveal(run, 'L2'))
    const res = await distribute(run.id, 'L2', free, 'Petr')
    expect(res.applied).toBe(false)
    expect((await getRun(run.id))?.loot.L2).toMatchObject({ state: 'rozdelena', to: free, applied: false })
    expect((await getLog('c1'))!.events.some((e) => e.note?.startsWith('Kořist'))).toBe(false)
    expect((await getParty(run.partyId))?.members).toHaveLength(2)
  })

  it('chybné upřesnění brání rozdělení a nic nezapíše', async () => {
    const { run, local } = await setup()
    const { saveRun } = await import('./store')
    const r = refine(reveal(run, 'L1'), 'L1', {})
    await saveRun({ ...r, loot: { L1: { ...r.loot.L1, amount: 0 } } })
    await expect(distribute(run.id, 'L1', local, 'Petr')).rejects.toThrow(/Množství/)
    expect(characterOf((await getLog('c1'))!).cash.grose).toBe(0)
  })
})
