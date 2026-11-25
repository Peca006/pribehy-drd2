import { expect, test } from '@playwright/test'

// Obnova ze zálohy do zařízení, kde nic z toho není (hlavní případ: nový telefon). Zkouší se i záloha z doby před sezeními.

const ev = (id: string, path: string, value: string) => ({
  id,
  at: '2026-11-20T10:00:00.000Z',
  by: 'Petr',
  path,
  value,
  note: 'Tvorba postavy',
})

const backup = (withSittings: boolean) => ({
  format: 'drd2-zaloha',
  v: 1,
  created: '2026-11-24T10:00:00.000Z',
  app: withSittings ? '0.5.10' : '0.5.0',
  characters: ['Aneta', 'Boris', 'Cecilie'].map((n, i) => ({ id: `zc${i}`, events: [ev(`ze${i}`, 'name', n)] })),
  parties: [
    {
      id: 'zp1',
      name: 'Vlci ze zálohy',
      notes: '',
      members: [
        { id: 'zm0', name: 'Aneta', characterId: 'zc0' },
        { id: 'zm1', name: 'Boris', characterId: 'zc1' },
      ],
      journal: [{ id: 'zj1', at: '2026-11-20T10:00:00.000Z', by: 'Petr', title: 'První sezení', text: 'Vyrazili.' }],
      updated: '2026-11-20',
    },
  ],
  creatures: [],
  recipes: [],
  adventures: [{ id: 'za1', name: 'Stará cesta', theme: '', background: '', notes: '', expeditionIds: ['zx1'], created: '2026-11-20', updated: '2026-11-20' }],
  expeditions: [
    {
      id: 'zx1',
      name: 'Hrad Kruh',
      adventureId: 'za1',
      theme: '',
      background: '',
      hook: '',
      goal: '',
      style: 'domino',
      nodes: [],
      incidents: [],
      resolution: '',
      notes: '',
      created: '2026-11-20',
      updated: '2026-11-20',
    },
  ],
  runs: [
    { id: 'zr1', name: 'Hrad Kruh s Vlky', partyId: 'zp1', expeditionId: 'zx1', status: 'probiha', reachedNodes: [], incidents: {}, extra: [], loot: {}, notes: '', started: '2026-11-20', updated: '2026-11-20' },
  ],
  ...(withSittings
    ? {
        sittings: [
          {
            id: 'zs1',
            partyId: 'zp1',
            status: 'hotovo',
            started: 1_795_000_000_000,
            ended: 1_795_000_090_000,
            spans: [
              { memberId: 'zm0', from: 1_795_000_000_000, to: 1_795_000_060_000 },
              { memberId: 'zm1', from: 1_795_000_060_000, to: 1_795_000_090_000 },
            ],
            updated: '2026-11-24T10:00:00.000Z',
          },
        ],
      }
    : {}),
  local: {},
})

for (const novy of [true, false]) {
  test(`obnova do prázdného zařízení: záloha ${novy ? 'se sezeními' : 'z doby před sezeními'}`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('drd2.packPromptDismissed', '1'))
    await page.goto('/#/knihovna/dilna')
    await expect(page.getByRole('navigation', { name: 'Hlavní navigace' })).toBeVisible()

    await page.getByLabel('Obnovit ze zálohy').setInputFiles({
      name: 'zaloha.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(backup(novy))),
    })
    await expect(page.getByText(/3 postav, 1 družin/)).toBeVisible()
    await page.getByRole('button', { name: 'Obnovit data' }).click()
    await expect(page.getByText(/Obnoveno: přidáno 3 postav, 1 družin/)).toBeVisible()
    await expect(page.getByText('could not be cloned')).toHaveCount(0)

    // data jsou po načtení znovu vidět v aplikaci
    await page.reload()
    await page.goto('/#/druziny')
    await expect(page.getByText('Vlci ze zálohy')).toBeVisible()
    await page.getByText('Vlci ze zálohy').click()
    await page.getByRole('link', { name: /Hra \(časomíra\)/ }).click()
    if (novy) {
      await expect(page.getByRole('heading', { name: 'Poslední sezení' })).toBeVisible()
      await expect(page.getByLabel('Poslední sezení')).toContainText('Aneta')
    } else {
      await expect(page.getByRole('button', { name: 'Začít sezení' })).toBeVisible()
    }
    await page.goto('/#/vypravy')
    await expect(page.getByText('Stará cesta').first()).toBeVisible()
  })
}
