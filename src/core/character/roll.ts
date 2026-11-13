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

/** Výsledek střetu dvou účastníků: kdo má vyšší hod; shoda se řeší dál (aktér, vyšší kostka, součet, los). */
export const compareRolls = (a: number, b: number): 'a' | 'b' | 'remiza' =>
  a > b ? 'a' : b > a ? 'b' : 'remiza'
