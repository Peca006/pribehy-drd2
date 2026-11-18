import type { ManeuverId } from './maneuvers'
import { clash, counted, evaluateRoll, type ClashResult, type Dice, type Mode, type RollResult, type Side } from './roll'

// Čisté vyhodnocení akce (zkouška, výzva, střet) z hozených kostek: vytaženo z `Roll.svelte`, aby se pravidla
// dala testovat bez komponenty. Komponenta drží jen stav ovládacích prvků a z něj volá `evaluateAction`.

export type Kind = 'zkouska' | 'vyzva' | 'stret'
/** Kdo byl aktér střetu: já, soupeř, nebo nejasné (pak při shodě rozhodují kostky). */
export type Actor = 'me' | 'opp' | 'unclear'

export interface ActionInput {
  kind: Kind
  /** moje dvě kostky (0 = nehozeno) a případná třetí kostka (manévr Přesně nebo postih Nepřesně) */
  dice: Dice
  extra: number
  man?: ManeuverId
  /** postih Nepřesně: 3 kostky, počítají se dvě nejnižší */
  inaccurate: boolean
  level: number
  oppDice: Dice
  oppLevel: number
  actor: Actor
  /** výsledek losu při úplné shodě ve střetu */
  losWin?: 'me' | 'opp'
}

export interface ActionState {
  mode: Mode
  /** hází se třemi kostkami */
  three: boolean
  /** dvě započítané kostky */
  pair: Dice
  /** moje kostky jsou hozené (u tří kostek i třetí) */
  rolled: boolean
  result?: RollResult
  oppRolled: boolean
  opp?: RollResult
  clashRes?: ClashResult
  /** vyhodnocení je rozhodnuto (u střetu i po losu) */
  done: boolean
  won: boolean
}

/** Přesně = 3 kostky, dvě nejvyšší; postih Nepřesně = 3 kostky, dvě nejnižší (Přesně pak nejde). */
export const actionMode = (man: ManeuverId | undefined, inaccurate: boolean): Mode =>
  man === 'presne' ? 'best' : inaccurate ? 'worst' : 'normal'

export function evaluateAction(i: ActionInput): ActionState {
  const mode = actionMode(i.man, i.inaccurate)
  const three = mode !== 'normal'
  const pair = counted(three ? [...i.dice, i.extra] : i.dice, mode)
  const rolled = i.dice[0] > 0 && i.dice[1] > 0 && (!three || i.extra > 0)
  const result = rolled ? evaluateRoll(pair, i.level) : undefined
  const oppRolled = i.oppDice[0] > 0 && i.oppDice[1] > 0
  const opp = oppRolled ? evaluateRoll(i.oppDice, i.oppLevel) : undefined
  const actorSide: Side | undefined = i.actor === 'me' ? 'a' : i.actor === 'opp' ? 'b' : undefined
  const clashRes =
    result && opp
      ? clash({ dice: pair, total: result.total }, { dice: i.oppDice, total: opp.total }, actorSide)
      : undefined
  const done =
    i.kind === 'stret' ? !!clashRes && (clashRes.winner !== 'los' || !!i.losWin) : !!result
  const won =
    i.kind === 'stret'
      ? clashRes?.winner === 'a' || (clashRes?.winner === 'los' && i.losWin === 'me')
      : !!result?.success
  return { mode, three, pair, rolled, result, oppRolled, opp, clashRes, done, won }
}
