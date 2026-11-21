// Od kterého zápisu žurnálu Průvodce družinu sdílí: nové a změněné od posledního odeslání, od zvoleného zápisu, nebo vše.
import type { JournalEntry } from './model'

export type PartyShareMode = 'nove' | 'bod' | 'cela'

const stamp = (e: JournalEntry) => e.edited ?? e.at

/** Schválené zápisy od nejstaršího (podle času vzniku nebo poslední úpravy), ze kterých jde začátek vybrat. */
export const choosableEntries = (journal: readonly JournalEntry[]): JournalEntry[] =>
  journal.filter((e) => !e.status).sort((a, b) => (stamp(a) < stamp(b) ? -1 : stamp(a) > stamp(b) ? 1 : 0))

/** Čas, po kterém se zápisy berou (`buildPartyBundle` bere ty novější); `null` = všechny. */
export function sinceFor(
  journal: readonly JournalEntry[],
  mode: PartyShareMode,
  lastSent?: string,
  fromId?: string,
): string | null {
  if (mode === 'nove') return lastSent ?? null
  if (mode === 'bod') {
    const e = journal.find((x) => x.id === fromId)
    return e ? new Date(Date.parse(stamp(e)) - 1).toISOString() : null
  }
  return null
}
