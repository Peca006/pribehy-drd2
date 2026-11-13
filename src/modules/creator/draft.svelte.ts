import { emptyCharacter, newId, type Character } from '../../core/character/model'
import type { Attribute, CreationRules } from '../../core/content/schema'
import type { DraftData } from './draftData'

/** Rozpracovaná postava v průvodci. Změny z kroků se zapisují přímo sem. */
export class Draft {
  concept = $state('')
  name = $state('')
  raceId = $state<string | undefined>(undefined)
  cultureId = $state<string | undefined>(undefined)
  levels = $state<Record<string, number>>({})
  attributes = $state<Record<Attribute, number>>({ Tělo: 5, Duše: 5, Vliv: 5 })
  raceAbility = $state('')
  weaponKind = $state('')
  abilities = $state<string[]>([])
  trait = $state('')
  heroStory = $state('')
  equipment = $state<string[]>([])
  cash = $state(0)
  /** způsob výběru výbavy */
  equipMode = $state<'kit' | 'buy'>('kit')
  kitId = $state<string | undefined>(undefined)
  /** řádky, které do výbavy naposledy vložila sada bez popisu (viz `kitId`) */
  kitLines = $state<string[]>([])
  cart = $state<Record<string, number>>({})

  constructor(rules?: CreationRules) {
    if (rules) {
      const each = Math.floor(rules.attributePoints / 3)
      this.attributes = { Tělo: each, Duše: each, Vliv: rules.attributePoints - 2 * each }
    }
  }

  /** Prostá kopie všech vyplněných hodnot (pro uložení). */
  snapshot(): DraftData {
    return $state.snapshot({
      concept: this.concept,
      name: this.name,
      raceId: this.raceId,
      cultureId: this.cultureId,
      levels: this.levels,
      attributes: this.attributes,
      raceAbility: this.raceAbility,
      weaponKind: this.weaponKind,
      abilities: this.abilities,
      trait: this.trait,
      heroStory: this.heroStory,
      equipment: this.equipment,
      cash: this.cash,
      equipMode: this.equipMode,
      kitId: this.kitId,
      kitLines: this.kitLines,
      cart: this.cart,
    })
  }

  /** Přepíše hodnoty uloženými (už očištěnými) daty. */
  restore(d: DraftData) {
    Object.assign(this, d)
  }

  toCharacter(): Character {
    return {
      ...emptyCharacter(newId()),
      name: this.name.trim(),
      concept: this.concept.trim(),
      raceId: this.raceId,
      cultureId: this.cultureId,
      attributes: { ...this.attributes },
      professions: Object.fromEntries(Object.entries(this.levels).filter(([, v]) => v > 0)),
      abilities: [...(this.raceAbility ? [this.raceAbility] : []), ...this.abilities],
      weaponKind: this.weaponKind.trim(),
      trait: this.trait,
      heroStory: this.heroStory.trim(),
      equipment: [...this.equipment],
      cash: this.cash,
    }
  }
}
