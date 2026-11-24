import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { closeDb } from '../db'
import { emptyParty } from '../party/model'
import { getParty, saveParty } from '../party/store'
import { addIncident } from './deck'
import { assignExpedition, emptyAdventure, emptyExpedition } from './model'
import { finish } from './run'
import { beginRun, closeRun, ledParties, nextExpeditions, runRows } from './runs'
import { getRun, saveAdventure, saveExpedition, saveRun } from './store'

beforeEach(async () => {
  await closeDb()
  globalThis.indexedDB = new IDBFactory()
})

describe('zahájení vedení a přehledy', () => {
  it('vedení vznikne pro vedenou družinu a existující výpravu, zbytek odmítne', async () => {
    const e = emptyExpedition('Cesta')
    await saveExpedition(e)
    const mine = emptyParty('Vlci')
    const theirs = { ...emptyParty('Cizí'), role: 'hrac' as const }
    await saveParty(mine)
    await saveParty(theirs)

    const run = await beginRun(e.id, mine.id)
    expect(run.name).toBe('Cesta – Vlci')
    expect((await getRun(run.id))?.status).toBe('probiha')
    await expect(beginRun(e.id, theirs.id)).rejects.toThrow(/nevedete/)
    await expect(beginRun('nic', mine.id)).rejects.toThrow(/Výprava/)
    await expect(beginRun(e.id, 'nic')).rejects.toThrow(/Družina/)
    expect((await ledParties()).map((p) => p.name)).toEqual(['Vlci'])
  })

  it('jedna výprava běží souběžně u více družin a přehled ukáže postup', async () => {
    let e = emptyExpedition('Cesta')
    const r1 = addIncident(e)
    e = r1.expedition
    await saveExpedition(e)
    const a = emptyParty('A')
    const b = emptyParty('B')
    await saveParty(a)
    await saveParty(b)
    const run = await beginRun(e.id, a.id)
    await beginRun(e.id, b.id)
    await saveRun(finish(run, r1.incident.id, 'uspech', 'hotovo'))

    const rows = await runRows()
    expect(rows).toHaveLength(2)
    const rowA = rows.find((r) => r.party?.name === 'A')!
    expect([rowA.played, rowA.total]).toEqual([1, 1])
    expect(rows.find((r) => r.party?.name === 'B')!.played).toBe(0)
    expect(await runRows((r) => r.partyId === b.id)).toHaveLength(1)
  })

  it('uzavření uloží schválený zápis do žurnálu družiny a vedení označí jako hotové', async () => {
    const e = emptyExpedition('Cesta')
    await saveExpedition(e)
    const p = emptyParty('Vlci')
    await saveParty(p)
    const run = await beginRun(e.id, p.id)

    const r = await closeRun(run.id, { title: 'Výprava: Cesta', text: 'Odehráno.' }, 'Petr')
    expect(r.run.status).toBe('hotova')
    const party = await getParty(p.id)
    expect(party?.journal).toHaveLength(1)
    expect(party?.journal[0]).toMatchObject({ title: 'Výprava: Cesta', by: 'Petr' })
    expect(party?.journal[0].status).toBeUndefined()
    expect((await getRun(run.id))?.journalEntryId).toBe(party?.journal[0].id)

    await expect(closeRun(run.id, { title: '', text: '  ' }, 'Petr')).rejects.toThrow(/prázdný/)
    const again = await closeRun(run.id, { title: 'Další', text: 'x' }, 'Petr', { close: false })
    expect(again.party.journal).toHaveLength(2)
  })

  it('nabídne další výpravy dobrodružství', async () => {
    const adv = emptyAdventure('Bílý hrad')
    await saveAdventure(adv)
    let a = emptyExpedition('A', adv.id)
    let b = emptyExpedition('B', adv.id)
    const advWith = { ...adv, expeditionIds: [a.id, b.id] }
    await saveAdventure(advWith)
    a = assignExpedition(a, advWith, [advWith]).expedition
    b = assignExpedition(b, advWith, [advWith]).expedition
    await saveExpedition(a)
    await saveExpedition(b)
    const p = emptyParty('Vlci')
    await saveParty(p)
    const run = await beginRun(a.id, p.id)
    expect((await nextExpeditions(run)).map((e) => e.name)).toEqual(['B'])
    await beginRun(b.id, p.id)
    expect(await nextExpeditions(run)).toEqual([])
  })
})
