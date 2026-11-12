// Družina: skupina hráčských postav s žurnálem dobrodružství a zápisy ze sezení (včetně rozdělení bodů
// zkušeností podle pravidel). Člen může mít postavu v tomto zařízení (`characterId`), nebo jen jméno
// (postava je u hráče na jeho zařízení).

export interface Member {
  id: string
  /** jméno hráče nebo postavy, jak se zobrazuje */
  name: string
  /** ID postavy uložené v tomto zařízení (zkušenosti se jí mohou rovnou připsat) */
  characterId?: string
}

/** Zkušenosti rozdané při sezení: kolik dostal který člen a komu už byly připsány do deníku postavy. */
export interface SessionRecord {
  xp: Record<string, number>
  /** ID členů, jejichž postavě už byly body připsány */
  applied: string[]
}

/** Průvodce vede družinu (jeho zařízení je pravda); hráč má její kopii a navrhuje zápisy. */
export type PartyRole = 'pruvodce' | 'hrac'

/** `navrh` = zápis hráče čekající na schválení Průvodce, `zamitnuto` = Průvodce ho zamítl; bez příznaku = schváleno. */
export type EntryStatus = 'navrh' | 'zamitnuto'

export interface JournalEntry {
  id: string
  status?: EntryStatus
  /** poslední úprava (ISO); bez ní platí `at` */
  edited?: string
  /** den sezení nebo zápisu (ISO datum) */
  at: string
  by: string
  title: string
  text: string
  session?: SessionRecord
}

export interface Party {
  id: string
  /** chybí-li (starší družiny), vede ji toto zařízení */
  role?: PartyRole
  name: string
  notes: string
  members: Member[]
  journal: JournalEntry[]
  /** ID zamítnutých návrhů hráčů (Průvodce je posílá zpět, aby hráči věděli) */
  rejected?: string[]
  /** kdy se naposledy odeslala družina hráčům */
  lastSent?: string
  updated: string
}

export const roleOf = (p: Party): PartyRole => p.role ?? 'pruvodce'

let counter = 0
export const newPartyId = () =>
  `${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`

export const emptyParty = (name = ''): Party => ({
  id: newPartyId(),
  role: 'pruvodce',
  name,
  notes: '',
  members: [],
  journal: [],
  updated: new Date().toISOString(),
})

/** Za účast na sezení dostane každý 4 body zkušeností; k tomu až 2 body za odměnu od ostatních. */
export const XP_ATTENDANCE = 4
export const XP_REWARD_MAX = 2

export interface Award {
  /** body zkušeností podle člena (jen přítomní) */
  xp: Record<string, number>
  problems: string[]
}

/**
 * Body zkušeností za sezení: účast + odměna (nejvýš 2 na hráče). Každý hráč smí udělit jeden bod a Průvodce
 * jeden, takže odměn může být nejvýš počet přítomných hráčů + 1; víc je jen upozornění (vypravěč rozhodne).
 */
export function sessionAward(
  members: Member[],
  attended: Set<string>,
  reward: Record<string, number>,
  base = XP_ATTENDANCE,
): Award {
  const xp: Record<string, number> = {}
  const problems: string[] = []
  let rewards = 0
  for (const m of members) {
    const r = Math.max(0, Math.floor(reward[m.id] ?? 0))
    if (!attended.has(m.id)) {
      if (r > 0) problems.push(`${m.name}: odměna pro nepřítomného se nezapočítá.`)
      continue
    }
    if (r > XP_REWARD_MAX)
      problems.push(
        `${m.name}: za odměnu lze získat nejvýš ${XP_REWARD_MAX} body, započtou se jen tolik.`,
      )
    const got = Math.min(r, XP_REWARD_MAX)
    rewards += got
    xp[m.id] = base + got
  }
  const players = attended.size
  if (rewards > players + 1)
    problems.push(
      `Odměnových bodů je ${rewards}, rozdělit lze nejvýš ${players + 1} (každý hráč jeden a Průvodce jeden).`,
    )
  return { xp, problems }
}
