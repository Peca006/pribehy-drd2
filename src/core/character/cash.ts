// Hotovost postavy: ukládá se jedno číslo v haléřích (`Character.cash`), ovládá se po dukátech, grošech a haléřích.
// 1 groš = 10 haléřů, 1 dukát = 10 grošů. Plus na 9 přeteče do vyššího řádu, mínus na 0 si „půjčí“ z vyššího; změna
// vyššího řádu nikdy nemění nižší (groš ±1 nemění haléře). To všechno dává obyčejná aritmetika nad haléři.

export type CashUnit = 'dukaty' | 'grose' | 'halere'
export const UNIT: Record<CashUnit, number> = { halere: 1, grose: 10, dukaty: 100 }
export const UNIT_ORDER: CashUnit[] = ['dukaty', 'grose', 'halere']
export const UNIT_LABEL: Record<CashUnit, string> = { dukaty: 'Dukáty', grose: 'Groše', halere: 'Haléře' }

/** Rozklad částky v haléřích na dukáty (neomezeně), groše (0 až 9) a haléře (0 až 9). */
export function splitCash(heller: number): Record<CashUnit, number> {
  const n = Math.max(0, Math.floor(heller))
  return { dukaty: Math.floor(n / 100), grose: Math.floor((n % 100) / 10), halere: n % 10 }
}

/** Dá se k částce přičíst `delta` haléřů (výsledek nesmí být záporný)? */
export const canChange = (heller: number, delta: number): boolean => heller + delta >= 0

/**
 * Změna jedné jednotky (tlačítko ± u dukátů, grošů nebo haléřů), která „rozměňuje dukát“: ubírá se z grošů nebo haléřů
 * a přitom klesne počet dukátů (půjčka z vyššího řádu). Pro dotaz, protože fikčně nemusí být snadné dukát rozměnit.
 */
export function breaksDucat(heller: number, unit: CashUnit, sign: 1 | -1): boolean {
  if (sign > 0 || unit === 'dukaty') return false
  const after = heller - UNIT[unit]
  return after >= 0 && splitCash(after).dukaty < splitCash(heller).dukaty
}

const plural = (n: number, one: string, few: string, many: string) =>
  n === 1 ? one : n >= 2 && n <= 4 ? few : many

/** Čitelný zápis změny částky, např. „+2 groše“ nebo „−1 dukát 5 haléřů“ (nejmenší zápis rozdílu). */
export function formatDelta(delta: number): string {
  if (!delta) return '0'
  const { dukaty, grose, halere } = splitCash(Math.abs(delta))
  const parts = [
    dukaty ? `${dukaty} ${plural(dukaty, 'dukát', 'dukáty', 'dukátů')}` : '',
    grose ? `${grose} ${plural(grose, 'groš', 'groše', 'grošů')}` : '',
    halere ? `${halere} ${plural(halere, 'haléř', 'haléře', 'haléřů')}` : '',
  ].filter(Boolean)
  return `${delta > 0 ? '+' : '−'}${parts.join(' ')}`
}
