// Paměť navigace: poslední otevřená stránka v každé sekci (Postava, Družina, Příručka, …) a poslední posun stránky.
// Hráč tak může při hře odskočit do pravidel nebo bestiáře a vrátit se tam, kde skončil.
export interface NavState {
  /** modul → poslední adresa (`#/modul/…`) */
  routes: Record<string, string>
  /** adresa → svislý posun; nejnovější poslední, počet je omezený */
  scroll: Record<string, number>
}

export const NAV_KEY = 'drd2-nav'
export const MAX_SCROLL_ENTRIES = 80

export const emptyNav = (): NavState => ({ routes: {}, scroll: {} })

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** Načte stav z textu; cokoli nesrozumitelného se tiše zahodí. */
export function parseNav(raw: string | null | undefined): NavState {
  const out = emptyNav()
  try {
    const v: unknown = JSON.parse(raw ?? 'null')
    if (!isRecord(v)) return out
    if (isRecord(v.routes))
      for (const [k, h] of Object.entries(v.routes))
        if (typeof h === 'string' && h.startsWith('#/')) out.routes[k] = h
    if (isRecord(v.scroll))
      for (const [h, y] of Object.entries(v.scroll))
        if (typeof y === 'number' && Number.isFinite(y) && y >= 0) out.scroll[h] = Math.round(y)
  } catch {
    /* poškozený záznam = prázdná paměť */
  }
  return out
}

/** Modul adresy `#/modul/…`; prázdný, když adresa žádný modul nemá. */
export const moduleOf = (hash: string): string =>
  decodeURIComponent(hash.replace(/^#\/?/, '').split('/')[0] ?? '')

/** Zapamatuje adresu jako poslední v jejím modulu. */
export function remember(s: NavState, hash: string) {
  const m = moduleOf(hash)
  if (m) s.routes[m] = hash
}

/** Kam má vést záložka modulu: poslední adresa, jinak kořen modulu. */
export const lastHash = (s: NavState, module: string): string =>
  s.routes[module] ?? '#/' + encodeURIComponent(module)

export function setScroll(s: NavState, hash: string, y: number) {
  delete s.scroll[hash]
  if (y > 0) s.scroll[hash] = Math.round(y)
  const keys = Object.keys(s.scroll)
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_SCROLL_ENTRIES))) delete s.scroll[k]
}

export const getScroll = (s: NavState, hash: string): number => s.scroll[hash] ?? 0
