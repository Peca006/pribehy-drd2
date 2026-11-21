// Přechody stavu manévru a plateb v panelu Hod (vytaženo z `Roll.svelte`): čisté funkce bez komponenty, aby se pravidla
// „nejvýš jeden manévr, platí se 1 Zdrojem až při použití, Přesně a Nepřesně se vylučují“ dala testovat.
import type { Attribute } from '../content/schema'
import type { ManeuverId } from './maneuvers'
import { describeRoll, rollInitiative, type Mode } from './roll'

export interface ManeuverState {
  man?: ManeuverId
  /** manévr už je zaplacený (v téže akci se neplatí podruhé) */
  manPaid: boolean
  manMsg: string
  /** třetí kostka (Přesně nebo postih Nepřesně) */
  extra: number
  /** postih Nepřesně */
  inaccurate: boolean
}

export const initialManeuver = (): ManeuverState => ({ manPaid: false, manMsg: '', extra: 0, inaccurate: false })

/** Nová akce: manévr se znovu neplatí a nic z předchozí akce nezůstává (volba manévru a postih se zachovají). */
export const newActionManeuver = (s: ManeuverState): ManeuverState => ({ ...s, manPaid: false, manMsg: '', extra: 0 })

/** Volba nebo zrušení manévru. Zaplacený manévr se nemění; Přesně vypne postih. */
export function pickManeuver(s: ManeuverState, id: ManeuverId): ManeuverState {
  if (s.manPaid) return s
  const man = s.man === id ? undefined : id
  const inaccurate = man === 'presne' ? false : s.inaccurate
  const extra = man !== 'presne' && !inaccurate ? 0 : s.extra
  return { ...s, man, inaccurate, extra, manMsg: '' }
}

/** Přepnutí postihu Nepřesně: vypne Přesně a při vypnutí postihu bez Přesně zahodí třetí kostku. */
export function toggleInaccurate(s: ManeuverState): ManeuverState {
  const inaccurate = !s.inaccurate
  const man = inaccurate && s.man === 'presne' ? undefined : s.man
  const extra = !inaccurate && man !== 'presne' ? 0 : s.extra
  return { ...s, inaccurate, man, extra }
}

/** Zaplatí manévr 1 Zdrojem vlastnosti (jen jednou za akci); `pay` vrací, zda postava měla Zdroj. */
export function payManeuver(
  s: ManeuverState,
  attr: Attribute,
  pay: (a: Attribute, n: number) => boolean,
): { state: ManeuverState; ok: boolean } {
  if (!s.man || s.manPaid) return { state: s, ok: true }
  if (!pay(attr, 1)) return { state: { ...s, manMsg: `Na manévr nemáte Zdroj (${attr}).` }, ok: false }
  return { state: { ...s, manPaid: true, manMsg: `Manévr zaplacen (1 ${attr}).` }, ok: true }
}

export interface InitiativeOutcome {
  /** hod proběhl (jinak chybí Duše na přístup) */
  ok: boolean
  /** krátké oznámení u tlačítka (placení nebo nedostatek Duše); prázdné, když není co hlásit */
  flash: string
  text: string
}

/** Iniciativa: přístup rychle/pomalu stojí 1 Duši, platí se hned při hodu. */
export function initiativeAction(
  mode: Mode,
  pay: (a: Attribute, n: number) => boolean,
  rng: () => number = Math.random,
): InitiativeOutcome {
  if (mode !== 'normal' && !pay('Duše', 1)) return { ok: false, flash: 'Chybí Duše na přístup.', text: '' }
  const r = rollInitiative(mode, rng)
  return {
    ok: true,
    flash: mode !== 'normal' ? '−1 Duše' : '',
    text: `Iniciativa ${r.total} (${describeRoll(r.dice, mode)})`,
  }
}
