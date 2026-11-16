import { describe, expect, it } from 'vitest'
import { applyCraft, autoAlloc, checkCraft, craftNote, suggestCost, trapBatchCost, type CraftInput } from './crafting'
import { emptyCharacter } from './model'
import { addKind, adjustRaw } from './rawMaterials'

const ok = (r: { character?: unknown; error?: string }) => {
  expect(r.error).toBeUndefined()
  return r.character as ReturnType<typeof emptyCharacter>
}

// 3 Suroviny bez druhu, 🌿 4, ⚙ 2
const stocked = () => {
  let c = emptyCharacter('a')
  c = ok(addKind(c, '🌿', 'byliny', 'k1'))
  c = ok(addKind(c, '⚙', 'kov', 'k2'))
  c = adjustRaw(adjustRaw(adjustRaw(c, undefined, 3), 'k1', 4), 'k2', 2)
  return c
}

const input = (p: Partial<CraftInput> = {}): CraftInput => ({
  kind: 'vyroba',
  name: 'provazový žebřík',
  cost: 4,
  alloc: { '': 3, k2: 1 },
  result: 'uspech',
  addToEquipment: true,
  ...p,
})

describe('výroba a opravy: cena', () => {
  it('výroba je zhruba polovina ceny předmětu nahoru, oprava 5 za stupeň, nouzový nic', () => {
    expect(suggestCost('vyroba', 7, 1)).toBe(4)
    expect(suggestCost('vyroba', 0, 1)).toBe(0)
    expect(suggestCost('oprava', 99, 3)).toBe(15)
    expect(suggestCost('oprava', 0, 9)).toBe(25)
    expect(suggestCost('nouzovy', 50, 1)).toBe(0)
  })

  it('výchozí rozdělení bere nejdřív Suroviny bez druhu, pak druhy v pořadí vzniku', () => {
    expect(autoAlloc(stocked(), 5)).toEqual({ '': 3, k1: 2 })
    expect(autoAlloc(stocked(), 2)).toEqual({ '': 2 })
    // víc než má: rozdělí se, co jde
    expect(autoAlloc(stocked(), 99)).toEqual({ '': 3, k1: 4, k2: 2 })
  })
})

describe('výroba a opravy: kontrola', () => {
  it('rozdělení se musí rovnat ceně a nesmí překročit zásobu druhu', () => {
    const c = stocked()
    expect(checkCraft(c, input()).error).toBe('')
    expect(checkCraft(c, input({ alloc: { '': 3 } })).error).toMatch(/Zbývá rozdělit 1/)
    expect(checkCraft(c, input({ alloc: { '': 3, k1: 3 } })).error).toMatch(/o 2 Surovin víc/)
    expect(checkCraft(c, input({ cost: 3, alloc: { k2: 3 } })).error).toMatch(/nemá tolik/)
    expect(checkCraft(c, input({ alloc: { zzz: 4 } })).error).toMatch(/Neznámý druh/)
  })

  it('přerušení a nouzový předmět nic nespotřebují a nic nerozdělují', () => {
    const c = stocked()
    expect(checkCraft(c, input({ result: 'preruseno', alloc: {} })).error).toBe('')
    expect(checkCraft(c, input({ kind: 'nouzovy', cost: 5, alloc: {} })).spend).toBe(0)
  })
})

describe('výroba a opravy: provedení', () => {
  it('úspěch odečte Suroviny podle druhů a přidá předmět do výbavy', () => {
    const r = applyCraft(stocked(), input())
    expect(r.rawMaterials).toBe(0)
    expect(r.rawMaterialKinds.k1.count).toBe(4)
    expect(r.rawMaterialKinds.k2.count).toBe(1)
    expect(r.equipment).toEqual(['provazový žebřík'])
  })

  it('neúspěch Suroviny spotřebuje, ale předmět nevznikne; přerušení nechá vše', () => {
    const fail = applyCraft(stocked(), input({ result: 'neuspech' }))
    expect(fail.rawMaterials).toBe(0)
    expect(fail.equipment).toEqual([])
    const stop = applyCraft(stocked(), input({ result: 'preruseno', alloc: {} }))
    expect(stop.rawMaterials).toBe(3)
    expect(stop.equipment).toEqual([])
  })

  it('oprava spotřebuje Suroviny a výbavu nemění; nouzový předmět je zdarma a označený', () => {
    const rep = applyCraft(stocked(), input({ kind: 'oprava', cost: 5, alloc: { '': 3, k1: 2 } }))
    expect(rep.rawMaterials).toBe(0)
    expect(rep.rawMaterialKinds.k1.count).toBe(2)
    expect(rep.equipment).toEqual([])
    const emergency = applyCraft(stocked(), input({ kind: 'nouzovy', name: 'luk', cost: 0, alloc: {} }))
    expect(emergency.rawMaterials).toBe(3)
    expect(emergency.equipment).toEqual(['luk (nouzový)'])
  })

  it('neplatné zadání nic nezmění', () => {
    const c = stocked()
    expect(applyCraft(c, input({ alloc: {} }))).toBe(c)
  })

  it('poznámka k revizi popíše, co se stalo', () => {
    const c = stocked()
    const label = (k: string) => (k === '' ? 'bez druhu' : k === 'k2' ? '⚙' : '🌿')
    expect(craftNote(c, input(), label)).toBe('Výroba: provazový žebřík (4 Surovin: bez druhu 3, ⚙ 1)')
    expect(craftNote(c, input({ result: 'neuspech' }), label)).toMatch(/Suroviny propadly/)
    expect(craftNote(c, input({ kind: 'nouzovy', name: 'luk', cost: 0, alloc: {} }), label)).toBe('Nouzový předmět: luk')
  })
})

describe('výroba lektvaru', () => {
  const lektvar = (p: Partial<CraftInput> = {}): CraftInput => ({
    kind: 'lektvar',
    name: '',
    cost: 3,
    alloc: { '': 3 },
    result: 'uspech',
    addToEquipment: false,
    potion: { attribute: 'Tělo', scar: 'popálenina' },
    ...p,
  })

  it('úspěch spotřebuje Suroviny a vytvoří lektvar s tolika Surovinami, kolik se vložilo', () => {
    expect(suggestCost('lektvar', 0, 1)).toBe(3)
    const r = applyCraft(stocked(), lektvar())
    expect(r.rawMaterials).toBe(0)
    const made = Object.values(r.potions)
    expect(made).toEqual([{ attribute: 'Tělo', scar: 'popálenina', count: 3, note: '' }])
    expect(r.equipment).toEqual([])
  })

  it('neúspěch Suroviny spotřebuje bez lektvaru, přerušení nic; chybí-li druh Jizvy, je to chyba', () => {
    expect(Object.keys(applyCraft(stocked(), lektvar({ result: 'neuspech' })).potions)).toHaveLength(0)
    expect(applyCraft(stocked(), lektvar({ result: 'neuspech' })).rawMaterials).toBe(0)
    expect(applyCraft(stocked(), lektvar({ result: 'preruseno', alloc: {} })).rawMaterials).toBe(3)
    expect(checkCraft(stocked(), lektvar({ potion: { attribute: 'Tělo', scar: ' ' } })).error).toMatch(/Jizvu/)
    expect(checkCraft(stocked(), lektvar({ cost: 0, alloc: {} })).error).toMatch(/aspoň 1/)
  })

  it('poznámka k revizi uvede, na co lektvar je', () => {
    const label = (k: string) => (k === '' ? 'bez druhu' : k)
    expect(craftNote(stocked(), lektvar(), label)).toBe('Lektvar: popálenina (Tělo) (3 Surovin: bez druhu 3)')
  })
})

describe('výroba nástrahy', () => {
  const nastraha = (p: Partial<CraftInput> = {}): CraftInput => ({
    kind: 'nastraha',
    name: '',
    cost: 4,
    alloc: { '': 3, k2: 1 },
    result: 'uspech',
    addToEquipment: false,
    trap: { name: 'Jáma s kůly', attribute: 'Tělo', type: 'jednoducha', effect: 'vyrazeni', count: 1 },
    ...p,
  })

  it('cena dávky je cena kusu krát počet kusů', () => {
    expect(trapBatchCost({ type: 'jednoducha', effect: 'vyrazeni', maneuver: '', extra: 0 }, 1)).toBe(4)
    expect(trapBatchCost({ type: 'jednoducha', effect: 'vyrazeni', maneuver: '', extra: 0 }, 3)).toBe(12)
  })

  it('úspěch spotřebuje Suroviny a zapíše nástrahu s počtem kusů; neúspěch jen propálí Suroviny', () => {
    const r = applyCraft(stocked(), nastraha({ trap: { ...nastraha().trap, count: 2 } }))
    expect(r.rawMaterials).toBe(0)
    expect(Object.values(r.traps)).toHaveLength(1)
    expect(Object.values(r.traps)[0]).toMatchObject({ name: 'Jáma s kůly', count: 2, effect: 'vyrazeni' })
    const fail = applyCraft(stocked(), nastraha({ result: 'neuspech' }))
    expect(fail.rawMaterials).toBe(0)
    expect(Object.keys(fail.traps)).toHaveLength(0)
    expect(checkCraft(stocked(), nastraha({ trap: { name: ' ', attribute: 'Tělo' } })).error).toMatch(/název/)
  })

  it('poznámka k revizi uvede nástrahu a počet kusů', () => {
    const label = (k: string) => (k === '' ? 'bez druhu' : k)
    expect(craftNote(stocked(), nastraha({ alloc: { '': 3, k2: 1 }, trap: { ...nastraha().trap, count: 2 } }), label)).toBe(
      'Nástraha: Jáma s kůly ×2 (4 Surovin: bez druhu 3, k2 1)',
    )
  })
})
