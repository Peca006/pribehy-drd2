// Pravidla tvorby postavy jako čisté funkce nad obsahovým balíčkem (žádná čísla ani texty pravidel
// zde nejsou napevno – berou se z `pack.creation` a z dat balíčku). Díky tomu jdou snadno testovat.
import type { Ability, Attribute, CreationRules, Profession, Race } from '../../core/content/schema'
import { ATTRIBUTES } from '../../core/character/model'

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

export const levelsUsed = (levels: Record<string, number>) => sum(Object.values(levels))
export const levelsLeft = (r: CreationRules, levels: Record<string, number>) =>
  r.startingLevels - levelsUsed(levels)

export const pointsUsed = (a: Record<Attribute, number>) => sum(ATTRIBUTES.map((k) => a[k]))
export const pointsLeft = (r: CreationRules, a: Record<Attribute, number>) =>
  r.attributePoints - pointsUsed(a)

/** Zvláštní schopnosti povolání, které se na začátku naučí (jedna za každou úroveň). */
export const professionAbilityBudget = (r: CreationRules, levels: Record<string, number>) =>
  levelsUsed(levels) * r.abilitiesPerLevel

/** Doporučené schopnosti („rychlá volba“) povolání pro danou úroveň. */
export function quickAbilities(p: Profession, level: number): Ability[] {
  return p.abilities
    .filter((a) => a.quickPickLevel !== undefined && a.quickPickLevel <= level)
    .sort((a, b) => a.quickPickLevel! - b.quickPickLevel!)
}

/** Rasová schopnost doporučená pro kulturu; bez kultury nic. */
export function quickRaceAbility(race: Race, cultureName: string | undefined): Ability | undefined {
  return cultureName ? race.abilities.find((a) => a.quickPickCulture === cultureName) : undefined
}

/** Kolik schopností povolání už je vybráno z daného povolání. */
export const abilitiesIn = (p: Profession, chosen: string[]) =>
  p.abilities.filter((a) => chosen.includes(a.id)).length

export interface Problem {
  step: string
  text: string
}

export interface DraftLike {
  raceId?: string
  levels: Record<string, number>
  attributes: Record<Attribute, number>
  raceAbility: string
  abilities: string[]
}

/** Co ještě chybí, aby postava byla hotová (prázdné = v pořádku). */
export function problems(r: CreationRules, professions: Profession[], d: DraftLike): Problem[] {
  const out: Problem[] = []
  if (!d.raceId) out.push({ step: 'rasa', text: 'Vyberte rasu.' })
  const left = levelsLeft(r, d.levels)
  if (left !== 0)
    out.push({
      step: 'povolani',
      text:
        left > 0 ? `Rozdělte ještě ${left} úrovní povolání.` : `Rozděleno o ${-left} úrovní víc.`,
    })
  const pl = pointsLeft(r, d.attributes)
  if (pl !== 0)
    out.push({
      step: 'zdatnost',
      text: pl > 0 ? `Rozdělte ještě ${pl} bodů zdatnosti.` : `Rozděleno o ${-pl} bodů víc.`,
    })
  if (ATTRIBUTES.some((k) => d.attributes[k] < r.attributeMin))
    out.push({
      step: 'zdatnost',
      text: `Každá vlastnost potřebuje alespoň ${r.attributeMin} bod.`,
    })
  if (!d.raceAbility)
    out.push({ step: 'schopnosti', text: 'Vyberte rasovou schopnost (nebo Rodovou zbraň).' })
  for (const p of professions) {
    const lvl = d.levels[p.id] ?? 0
    const n = abilitiesIn(p, d.abilities)
    if (n !== lvl * r.abilitiesPerLevel)
      out.push({
        step: 'schopnosti',
        text: `${p.name}: vybráno ${n} schopností, má být ${lvl * r.abilitiesPerLevel}.`,
      })
  }
  return out
}

/** Odstraní značky mini-markdownu (do prostého textu, např. na řádky výbavy). */
export const plain = (s: string) =>
  s
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*+/g, '')
    .trim()

/** Vypíše částku v haléřích jako „2 dukáty 3 groše 5 haléřů“ (nejmenší možná zápis). */
export function formatMoney(heller: number): string {
  if (heller <= 0) return '0 grošů'
  const duk = Math.floor(heller / 100)
  const gro = Math.floor((heller % 100) / 10)
  const hal = heller % 10
  const part = (n: number, one: string, few: string, many: string) =>
    n === 1 ? `1 ${one}` : n >= 2 && n <= 4 ? `${n} ${few}` : `${n} ${many}`
  return [
    duk ? part(duk, 'dukát', 'dukáty', 'dukátů') : '',
    gro ? part(gro, 'groš', 'groše', 'grošů') : '',
    hal ? part(hal, 'haléř', 'haléře', 'haléřů') : '',
  ]
    .filter(Boolean)
    .join(' ')
}

/**
 * Vloží holý výčet položek sady do výbavy, ale jen když je to bezpečné: výbava je prázdná, nebo je v ní
 * přesně to, co sem vložila předchozí sada (`last`). Ručně upravený nebo vlastní text se nikdy nepřepíše.
 */
export function applyKitGear(
  current: string[],
  last: string[],
  gear: string[],
): { equipment: string[]; inserted: string[]; replaced: boolean } {
  const lines = current.filter((l) => l.trim())
  const same = last.length > 0 && lines.length === last.length && lines.every((l, i) => l === last[i])
  if (!gear.length || (lines.length && !same)) return { equipment: current, inserted: last, replaced: false }
  return { equipment: [...gear], inserted: [...gear], replaced: true }
}
