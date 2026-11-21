import { describe, expect, it } from 'vitest'
import { characterOf, emptyCharacter, eventsFor, type Character } from '../character/model'
import { adjustPotion, removePotion, savePotion } from '../character/potions'
import { adjustTrap, saveTrap } from '../character/traps'
import { sealRecipe, type Recipe } from './model'
import { collapse, expand, stripped } from './working'

const ok = (r: { character: Character } | { error: string }) => {
  if ('error' in r) throw new Error(r.error)
  return r.character
}

const seal = (created: { id: string; input: Parameters<typeof sealRecipe>[1] }[]): Promise<Recipe[]> =>
  Promise.all(created.map((c) => sealRecipe(c.id, c.input)))

/** Zápis změny jako v aplikaci: rozbalené postavy → odkazy → události deníku → znovu rozbalená postava. */
async function write(before: Character, after: Character, recipes: Recipe[]) {
  const { character, created } = collapse(before, after, recipes)
  const all = [...recipes, ...(await seal(created))]
  const events = eventsFor(stripped(before), character, 'P', 'x')
  return { events, created, recipes: all, stored: character }
}

const base = () => ok(savePotion(emptyCharacter('a'), { attribute: 'Tělo', scar: 'popálenina', count: 3, note: 'mast' }, undefined))

describe('lektvary přes předpisy', () => {
  it('nový lektvar vytvoří předpis a odkaz se stavem; rozbalení vrátí původní lektvar', async () => {
    const c = base()
    const w = await write(emptyCharacter('a'), c, [])
    expect(w.created).toHaveLength(1)
    const id = Object.keys(c.potions)[0]
    expect(w.events.map((e) => e.path)).toEqual([`recipeLinks.${id}`])
    expect(w.stored.potions).toEqual({})
    const back = expand(characterOf({ id: 'a', events: w.events }), w.recipes)
    expect(back.potions).toEqual(c.potions)
  })

  it('změna počtu jen mění stav odkazu, předpis se nezdvojí', async () => {
    const c = base()
    const first = await write(emptyCharacter('a'), c, [])
    const id = Object.keys(c.potions)[0]
    const more = adjustPotion(c, id, 2)
    const second = await write(c, more, first.recipes)
    expect(second.created).toEqual([])
    expect(second.stored.recipeLinks[id].state).toEqual({ count: 5, note: 'mast' })
  })

  it('stejný lektvar u druhé postavy znovu použije předpis', async () => {
    const first = await write(emptyCharacter('a'), base(), [])
    const other = ok(savePotion(emptyCharacter('b'), { attribute: 'Tělo', scar: 'popálenina', count: 1 }))
    const second = await write(emptyCharacter('b'), other, first.recipes)
    expect(second.created).toEqual([])
    expect(Object.values(second.stored.recipeLinks)[0].recipeId).toBe(first.recipes[0].id)
  })

  it('úprava druhu Jizvy přepojí odkaz na jiný předpis, původní předpis zůstane', async () => {
    const c = base()
    const first = await write(emptyCharacter('a'), c, [])
    const id = Object.keys(c.potions)[0]
    const edited = ok(savePotion(c, { attribute: 'Tělo', scar: 'řezná rána', count: 3, note: 'mast' }, id))
    const second = await write(c, edited, first.recipes)
    expect(second.created).toHaveLength(1)
    expect(second.stored.recipeLinks[id].recipeId).not.toBe(first.recipes[0].id)
    expect(second.recipes).toHaveLength(2)
  })

  it('odstranění lektvaru odstraní odkaz, předpis zůstane v Grimoáru', async () => {
    const c = base()
    const first = await write(emptyCharacter('a'), c, [])
    const id = Object.keys(c.potions)[0]
    // jako v aplikaci: výchozí postava je rozbalená z uloženého stavu
    const loaded = expand(first.stored, first.recipes)
    const second = await write(loaded, ok(removePotion(loaded, id)), first.recipes)
    expect(second.stored.recipeLinks).toEqual({})
    expect(second.events).toHaveLength(1)
    expect(second.events[0].value).toBeUndefined()
  })

  it('odkaz na chybějící předpis se při rozbalení přeskočí', () => {
    const c = { ...emptyCharacter('a'), recipeLinks: { x: { recipeId: 'zmizel', state: { count: 1 } } } }
    expect(expand(c, []).potions).toEqual({})
  })
})

describe('nástrahy přes předpisy', () => {
  const trap = () => ok(saveTrap(emptyCharacter('a'), { name: 'Jáma', attribute: 'Tělo', effect: 'jizva', extra: 1, weakness: 'listí', count: 2, note: 'u brány' }))

  it('nástraha se přenáší jako předpis s odkazem a rozbalí se beze změny', async () => {
    const c = trap()
    const w = await write(emptyCharacter('a'), c, [])
    expect(w.recipes[0]).toMatchObject({ kind: 'nastraha', name: 'Jáma' })
    expect(w.recipes[0].params).toMatchObject({ vlastnost: 'Tělo', ucinek: 'jizva', extra: 1, slabina: 'listí' })
    const id = Object.keys(c.traps)[0]
    expect(w.stored.recipeLinks[id].state).toEqual({ count: 2, note: 'u brány' })
    expect(expand(characterOf({ id: 'a', events: w.events }), w.recipes).traps).toEqual(c.traps)
  })

  it('počet kusů je jen stav odkazu', async () => {
    const c = trap()
    const first = await write(emptyCharacter('a'), c, [])
    const id = Object.keys(c.traps)[0]
    const second = await write(c, adjustTrap(c, id, -1), first.recipes)
    expect(second.created).toEqual([])
    expect(second.stored.recipeLinks[id].state.count).toBe(1)
  })
})

describe('kouzla zůstávají nedotčená', () => {
  it('odkaz na kouzlo se při zápisu lektvarů zachová a lektvar ani nástraha z něj nevznikne', async () => {
    const spell = await sealRecipe('s1', { kind: 'kouzlo', name: 'Poryv' })
    const c = { ...base(), recipeLinks: { k1: { recipeId: 's1', state: {} } } }
    const w = await write({ ...emptyCharacter('a'), recipeLinks: c.recipeLinks }, c, [spell])
    expect(w.stored.recipeLinks.k1).toEqual({ recipeId: 's1', state: {} })
    const e = expand(w.stored, w.recipes)
    expect(Object.keys(e.potions)).toHaveLength(1)
    expect(e.traps).toEqual({})
  })
})
