// Hod kostkami podle pravidel: dvě šestistěnné kostky + úroveň povolání použité dovednosti. Nic jiného se k hodu
// nepřičítá. Má-li postava při jedné akci použít víc povolání, přičte si nejnižší z jejich úrovní; bez povolání 0.
import type { Character } from './model'

export type Dice = [number, number]

/** Hod 9 a více je úspěch ve zkoušce i ve výzvě (ve střetu vítězí vyšší hod, to se porovnává zvlášť). */
export const SUCCESS_AT = 9

const clampDie = (n: number) => Math.min(6, Math.max(1, Math.round(n) || 1))

export const rollDie = (rng: () => number = Math.random): number => 1 + Math.floor(rng() * 6)
export const rollDice = (rng: () => number = Math.random): Dice => [rollDie(rng), rollDie(rng)]

/** Úroveň k hodu: nejnižší úroveň z vybraných povolání postavy (nevlastněné se počítají jako 0); nic nevybráno = 0. */
export function levelOf(c: Character, professionIds: string[]): number {
  if (!professionIds.length) return 0
  return Math.min(...professionIds.map((id) => c.professions[id] ?? 0))
}

export interface RollResult {
  /** součet kostek */
  sum: number
  /** hod = součet kostek + úroveň povolání */
  total: number
  /** hod aspoň 9 (zkouška, výzva) */
  success: boolean
}

export function evaluateRoll(dice: Dice, level: number): RollResult {
  const sum = clampDie(dice[0]) + clampDie(dice[1])
  const total = sum + Math.max(0, Math.floor(level))
  return { sum, total, success: total >= SUCCESS_AT }
}

export type Side = 'a' | 'b'

export interface ClashResult {
  /** vítěz, nebo `los`, když nerozhodla žádná shoda */
  winner: Side | 'los'
  /** čím se rozhodlo */
  reason: 'hod' | 'aktér' | 'kostka' | 'součet' | 'los'
}

/**
 * Střet dvou účastníků: vyšší hod vítězí. Při shodě vítězí aktér (ten, kdo hlásil akci první). Není-li zřejmé, kdo jím byl,
 * rozhoduje vyšší hodnota na jedné z kostek, pak vyšší součet kostek a nakonec los.
 */
export function clash(
  a: { dice: Dice; total: number },
  b: { dice: Dice; total: number },
  actor?: Side,
): ClashResult {
  if (a.total !== b.total) return { winner: a.total > b.total ? 'a' : 'b', reason: 'hod' }
  if (actor) return { winner: actor, reason: 'aktér' }
  const hi = (d: Dice) => Math.max(d[0], d[1])
  if (hi(a.dice) !== hi(b.dice))
    return { winner: hi(a.dice) > hi(b.dice) ? 'a' : 'b', reason: 'kostka' }
  const sum = (d: Dice) => d[0] + d[1]
  if (sum(a.dice) !== sum(b.dice))
    return { winner: sum(a.dice) > sum(b.dice) ? 'a' : 'b', reason: 'součet' }
  return { winner: 'los', reason: 'los' }
}
