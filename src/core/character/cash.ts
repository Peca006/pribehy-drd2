// Hotovost postavy: tři samostatné hodnoty (dukáty, groše, haléře), 1 groš = 10 haléřů, 1 dukát = 10 grošů.
// Nic se samo nepřevádí do vyššího řádu (haléřů může být i víc než 9). Jen při čerpání pod nulu se „rozmění“ jedna mince
// z vyššího řádu; rozměnění dukátu se hráče ptá (fikčně nemusí být snadné).

export type CashUnit = 'dukaty' | 'grose' | 'halere'
export type Cash = Record<CashUnit, number>

export const UNIT_ORDER: CashUnit[] = ['dukaty', 'grose', 'halere']
export const UNIT_LABEL: Record<CashUnit, string> = { dukaty: 'Dukáty', grose: 'Groše', halere: 'Haléře' }
/** Hodnota jedné mince v haléřích. */
export const UNIT: Record<CashUnit, number> = { halere: 1, grose: 10, dukaty: 100 }
export const MAX_COINS = 99999

export const emptyCash = (): Cash => ({ dukaty: 0, grose: 0, halere: 0 })

const clean = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(MAX_COINS, Math.max(0, Math.floor(v))) : 0

/** Částka v haléřích rozložená nejkratším zápisem (dukáty, groše 0 až 9, haléře 0 až 9). */
export function fromHeller(heller: number): Cash {
  const n = Math.max(0, Math.floor(heller))
  return { dukaty: clean(Math.floor(n / 100)), grose: Math.floor((n % 100) / 10), halere: n % 10 }
}

/** Celková hodnota v haléřích. */
export const totalHeller = (c: Cash): number => UNIT_ORDER.reduce((n, u) => n + c[u] * UNIT[u], 0)

/** Hotovost z hodnoty neznámého původu: objekt se třemi počty, nebo (starý formát) jedno číslo v haléřích. */
export function cashFrom(raw: unknown): Cash {
  if (typeof raw === 'number') return fromHeller(raw)
  if (typeof raw !== 'object' || raw === null) return emptyCash()
  const r = raw as Record<string, unknown>
  return { dukaty: clean(r.dukaty), grose: clean(r.grose), halere: clean(r.halere) }
}

/** Přidá jednu minci dané hodnoty (bez přenosu do vyššího řádu). */
export const addCoin = (c: Cash, unit: CashUnit): Cash => ({ ...c, [unit]: Math.min(MAX_COINS, c[unit] + 1) })

/**
 * Utratí jednu minci dané hodnoty. Nemá-li postava minci té hodnoty, rozmění jednu z vyššího řádu (groš na 10 haléřů,
 * dukát na 10 grošů). `brokeDucat` říká, že se přitom rozměnil dukát. Nejde-li to (není z čeho), vrátí `undefined`.
 */
export function spendCoin(c: Cash, unit: CashUnit): { cash: Cash; brokeDucat: boolean } | undefined {
  if (c[unit] > 0) return { cash: { ...c, [unit]: c[unit] - 1 }, brokeDucat: false }
  if (unit === 'grose' && c.dukaty > 0) return { cash: { ...c, dukaty: c.dukaty - 1, grose: 9 }, brokeDucat: true }
  if (unit === 'halere') {
    if (c.grose > 0) return { cash: { ...c, grose: c.grose - 1, halere: 9 }, brokeDucat: false }
    if (c.dukaty > 0) return { cash: { ...c, dukaty: c.dukaty - 1, grose: 9, halere: 9 }, brokeDucat: true }
  }
  return undefined
}

export const canSpend = (c: Cash, unit: CashUnit): boolean => spendCoin(c, unit) !== undefined

const plural = (n: number, one: string, few: string, many: string) =>
  n === 1 ? one : n >= 2 && n <= 4 ? few : many

/** Zápis hotovosti po jednotkách bez převodů, např. „2 dukáty 13 haléřů“ (nulové jednotky se vynechají). */
export function formatCash(c: Cash): string {
  const parts = [
    c.dukaty ? `${c.dukaty} ${plural(c.dukaty, 'dukát', 'dukáty', 'dukátů')}` : '',
    c.grose ? `${c.grose} ${plural(c.grose, 'groš', 'groše', 'grošů')}` : '',
    c.halere ? `${c.halere} ${plural(c.halere, 'haléř', 'haléře', 'haléřů')}` : '',
  ].filter(Boolean)
  return parts.length ? parts.join(' ') : '0 grošů'
}
