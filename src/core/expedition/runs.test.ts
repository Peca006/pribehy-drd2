import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { closeDb } from '../db'
import { emptyParty } from '../party/model'
import { saveParty } from '../party/store'
import { addIncident } from './deck'
import { emptyExpedition } from './model'
import { finish } from './run'
import { beginRun, ledParties, runRows } from './runs'
import { getRun, saveExpedition, saveRun } from './store'

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
})
