import { beforeEach, describe, expect, it } from 'vitest'
import { clearDraft, hasContent, loadDraft, sanitizeDraft, saveDraft, type DraftData } from './draftData'

const empty: DraftData = {
  concept: '',
  name: '',
  levels: {},
  attributes: { Tělo: 5, Duše: 5, Vliv: 5 },
  raceAbility: '',
  weaponKind: '',
  abilities: [],
  trait: '',
  heroStory: '',
  equipment: [],
  cash: 0,
  equipMode: 'kit',
  cart: {},
}

// jednoduchá náhrada localStorage pro prostředí bez prohlížeče
const store = new Map<string, string>()
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
} as Storage

beforeEach(() => store.clear())

describe('sanitizeDraft', () => {
  it('ponechá jen známá pole správných typů', () => {
    const d = sanitizeDraft(
      {
        name: 'Ríša',
        raceId: 42,
        levels: { bojovnik: 3, x: 'a' },
        attributes: { Tělo: 7, Duše: 'x' },
        abilities: ['a', 1, 'b'],
        equipMode: 'buy',
        evil: '<script>',
      },
      empty,
    )
    expect(d.name).toBe('Ríša')
    expect(d.raceId).toBeUndefined()
    expect(d.levels).toEqual({ bojovnik: 3 })
    expect(d.attributes).toEqual({ Tělo: 7, Duše: 5, Vliv: 5 })
    expect(d.abilities).toEqual(['a', 'b'])
    expect(d.equipMode).toBe('buy')
    expect('evil' in d).toBe(false)
  })

  it('z nesmyslu udělá prázdný koncept', () => {
    expect(sanitizeDraft('x', empty)).toEqual(sanitizeDraft(null, empty))
    expect(hasContent(sanitizeDraft(42, empty))).toBe(false)
  })
})

describe('uložení konceptu', () => {
  it('uloží a načte i s krokem; prázdný koncept se neukládá', () => {
    saveDraft({ ...empty, name: 'Ríša' }, 'rasa')
    const l = loadDraft(empty)
    expect(l?.data.name).toBe('Ríša')
    expect(l?.step).toBe('rasa')
    saveDraft(empty, 'koncept')
    expect(loadDraft(empty)).toBeUndefined()
  })

  it('poškozená data a jiná verze se ignorují; clearDraft koncept smaže', () => {
    store.set('drd2-creator-draft', '{nesmysl')
    expect(loadDraft(empty)).toBeUndefined()
    store.set('drd2-creator-draft', JSON.stringify({ v: 99, data: { name: 'x' } }))
    expect(loadDraft(empty)).toBeUndefined()
    saveDraft({ ...empty, name: 'Ríša' }, 'rasa')
    clearDraft()
    expect(loadDraft(empty)).toBeUndefined()
  })
})
