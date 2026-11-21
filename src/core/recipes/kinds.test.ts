import { describe, expect, it } from 'vitest'
import { potionFrom } from '../character/potions'
import { potionToRecipe, recipeToPotion, recipeToTrap, trapToRecipe } from './kinds'
import { sealRecipe } from './model'
import { recipeSummary } from './summary'

const seal = (i: Parameters<typeof sealRecipe>[1]) => sealRecipe('r', i)

describe('lektvar jako předpis', () => {
  it('bez vlastního názvu má odvozený název a po převodu zpět žádné jméno', async () => {
    const p = potionFrom({ attribute: 'Tělo', scar: 'popálenina', count: 2, note: '' })!
    const r = await seal(potionToRecipe(p))
    expect(r.name).toBe('popálenina (Tělo)')
    expect(recipeToPotion(r, { count: 2 })).toEqual(p)
    expect(recipeSummary(r)).toBe('popálenina (Tělo)')
  })

  it('vlastní název a popis jdou tam i zpět, v přehledu je vlastnost a Jizva v závorce', async () => {
    const p = potionFrom({ attribute: 'Duše', scar: 'fobie', count: 1, note: '', name: 'Čirá mysl', description: 'Bylinný odvar.' })!
    const r = await seal(potionToRecipe(p))
    expect(r).toMatchObject({ name: 'Čirá mysl', description: 'Bylinný odvar.' })
    expect(recipeToPotion(r, { count: 1 })).toEqual(p)
    expect(recipeSummary(r)).toBe('Čirá mysl (Duše, fobie)')
  })

  it('název a popis mění otisk (jiný popis = jiný předpis)', async () => {
    const a = await seal({ kind: 'lektvar', name: 'X', description: 'a', params: { vlastnost: 'Tělo', jizva: 'rána' } })
    const b = await seal({ kind: 'lektvar', name: 'X', description: 'b', params: { vlastnost: 'Tělo', jizva: 'rána' } })
    expect(a.contentHash).not.toBe(b.contentHash)
  })
})

describe('nástraha jako předpis', () => {
  it('nese popis tam i zpět', async () => {
    const t = {
      name: 'Jáma',
      type: 'jednoducha' as const,
      attribute: 'Tělo' as const,
      effect: 'jizva' as const,
      maneuver: '' as const,
      extra: 0,
      weakness: 'listí',
      note: '',
      count: 1,
      description: 'Maskovaná jáma s kůly.',
    }
    const r = await seal(trapToRecipe(t))
    expect(r.description).toBe('Maskovaná jáma s kůly.')
    expect(recipeToTrap(r, { count: 1 })).toEqual(t)
  })
})
