// Spodní lišta: pořadí záložek, skrývání a přišpendlení jedné záložky vlevo a jedné vpravo (zbytek se posouvá).
// Čistá logika bez DOMu; nastavení se ukládá v `settings.svelte.ts`. Moduly lišta zná jen přes `id`.

export interface TabbarConfig {
  /** pořadí `id` modulů; co v něm chybí, se řadí za něj podle výchozího pořadí modulů */
  order: string[]
  /** skryté záložky (jsou dál dostupné z Více) */
  hidden: string[]
  /** přišpendlená záložka vlevo; prázdné = žádná */
  left: string
  /** přišpendlená záložka vpravo; prázdné = žádná */
  right: string
}

export type Placement = 'scroll' | 'left' | 'right' | 'hidden'

/** Záložka, kterou nejde skrýt: vede k nastavení, takže by si uživatel lištu nemohl vrátit. */
export const LOCKED_TAB = 'knihovna'

export const defaultTabbar = (): TabbarConfig => ({
  order: [],
  hidden: [],
  left: 'postavy',
  right: LOCKED_TAB,
})

const ID = /^[a-z0-9-]{1,40}$/
const MAX_ITEMS = 40

const ids = (v: unknown): string[] =>
  Array.isArray(v)
    ? [...new Set(v.filter((x): x is string => typeof x === 'string' && ID.test(x)))].slice(0, MAX_ITEMS)
    : []

/** Načte nastavení lišty; cokoli nesrozumitelného se nahradí výchozí hodnotou. */
export function parseTabbar(raw: unknown): TabbarConfig {
  const def = defaultTabbar()
  if (typeof raw !== 'object' || raw === null) return def
  const r = raw as Record<string, unknown>
  const pin = (v: unknown, fallback: string) =>
    v === '' ? '' : typeof v === 'string' && ID.test(v) ? v : fallback
  const cfg: TabbarConfig = {
    order: ids(r.order),
    hidden: ids(r.hidden).filter((i) => i !== LOCKED_TAB),
    left: pin(r.left, def.left),
    right: pin(r.right, def.right),
  }
  return normalize(cfg)
}

/** Skrytá záložka nemůže být přišpendlená a jedna záložka nemůže být na obou stranách. */
function normalize(c: TabbarConfig): TabbarConfig {
  const hidden = c.hidden.filter((i) => i !== LOCKED_TAB)
  const left = hidden.includes(c.left) ? '' : c.left
  let right = hidden.includes(c.right) ? '' : c.right
  if (left && left === right) right = ''
  return { order: c.order, hidden, left, right }
}

/** Všechna `id` v pořadí podle nastavení; neznámá se zahodí, nová moduly se přidají na konec. */
export function orderedIds(all: string[], cfg: TabbarConfig): string[] {
  const known = new Set(all)
  const first = cfg.order.filter((i) => known.has(i))
  const rest = all.filter((i) => !first.includes(i))
  return [...first, ...rest]
}

export interface TabbarLayout<T> {
  left: T | null
  middle: T[]
  right: T | null
}

/** Rozloží záložky na přišpendlenou levou, posuvný střed a přišpendlenou pravou. */
export function layoutTabs<T extends { id: string }>(mods: T[], cfg: TabbarConfig): TabbarLayout<T> {
  const c = normalize(cfg)
  const byId = new Map(mods.map((m) => [m.id, m]))
  const sorted = orderedIds(
    mods.map((m) => m.id),
    c,
  ).filter((i) => !c.hidden.includes(i))
  const left = c.left && sorted.includes(c.left) ? (byId.get(c.left) ?? null) : null
  const right = c.right && sorted.includes(c.right) ? (byId.get(c.right) ?? null) : null
  const middle = sorted
    .filter((i) => i !== left?.id && i !== right?.id)
    .map((i) => byId.get(i)!)
  return { left, middle, right }
}

export function placementOf(cfg: TabbarConfig, id: string): Placement {
  if (cfg.hidden.includes(id)) return 'hidden'
  if (cfg.left === id) return 'left'
  if (cfg.right === id) return 'right'
  return 'scroll'
}

/** Změní umístění jedné záložky; obsazenou přišpendlenou pozici uvolní předchozí záložce. */
export function setPlacement(cfg: TabbarConfig, id: string, to: Placement): TabbarConfig {
  if (to === 'hidden' && id === LOCKED_TAB) return cfg
  const next: TabbarConfig = {
    order: cfg.order,
    hidden: cfg.hidden.filter((i) => i !== id),
    left: cfg.left === id ? '' : cfg.left,
    right: cfg.right === id ? '' : cfg.right,
  }
  if (to === 'hidden') next.hidden = [...next.hidden, id]
  else if (to === 'left') next.left = id
  else if (to === 'right') next.right = id
  return normalize(next)
}

/** Posune záložku v pořadí o jedno místo (`-1` nahoru, `1` dolů); `all` jsou id všech záložek. */
export function moveTab(cfg: TabbarConfig, all: string[], id: string, dir: -1 | 1): TabbarConfig {
  const list = orderedIds(all, cfg)
  const i = list.indexOf(id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= list.length) return cfg
  ;[list[i], list[j]] = [list[j]!, list[i]!]
  return { ...cfg, order: list }
}

export const isDefaultTabbar = (cfg: TabbarConfig): boolean => {
  const d = defaultTabbar()
  return !cfg.order.length && !cfg.hidden.length && cfg.left === d.left && cfg.right === d.right
}
