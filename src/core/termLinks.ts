// Omezení počtu odkazů z pojmů (***pojem***) v textu: pojem se v SRD píše tučnou kurzívou u každého výskytu,
// a kdyby byl všude odkazem, text by byl samý odkaz. Podle nastavení (`LinkMode`) se ponechá odkaz jen
// u některých výskytů; ostatní se zobrazí stejně (tučná kurzíva), ale bez odkazu – k tomu slouží značka
// `NO_LINK` v textu. Texty v balíčcích se nemění, pravidla se používají až při zobrazení.
//
//  - `first`  odkaz má první výskyt pojmu (v kapitole, u bytosti);
//  - `spaced` totéž a odkaz se zopakuje po `SPACING` znacích textu (dlouhé kapitoly);
//  - `all`    všechny výskyty; `none` žádný.
// Pojem vysvětlený v téže kapitole se odkazuje jen před místem vysvětlení (zpět na již přečtené nemá smysl).
import type { Block, Creature, ListItem } from './content/schema'
import { NO_LINK } from './markdown'

export type LinkMode = 'first' | 'spaced' | 'all' | 'none'
export const LINK_MODES: { id: LinkMode; label: string }[] = [
  { id: 'first', label: 'jen první výskyt' },
  { id: 'spaced', label: 'první a po delším textu' },
  { id: 'all', label: 'všechny výskyty' },
  { id: 'none', label: 'žádné odkazy' },
]
export const isLinkMode = (v: unknown): v is LinkMode => LINK_MODES.some((m) => m.id === v)

/** Po kolika znacích textu se odkaz na tentýž pojem zopakuje (režim `spaced`). */
export const SPACING = 5000

export interface TermLinkContext {
  mode: LinkMode
  /** tvar pojmu (malými písmeny) → ID pojmu */
  index: Map<string, string>
  /** ID pojmu → kapitola a nadpis, kde je vysvětlen */
  home?: (termId: string) => { chapter: string; anchor?: string } | undefined
  /** kapitola, ve které se text zobrazuje (u bytosti prázdné) */
  chapterId?: string
}

export function createTermLimiter(ctx: TermLinkContext) {
  const last = new Map<string, number>() // pojem → poloha posledního odkazu
  const passed = new Set<string>() // nadpisy, které už v textu byly
  let pos = 0

  const linkable = (id: string): boolean => {
    if (ctx.mode === 'none') return false
    const h = ctx.home?.(id)
    if (h && ctx.chapterId && h.chapter === ctx.chapterId && h.anchor && passed.has(h.anchor)) return false
    const at = last.get(id)
    return at === undefined || (ctx.mode === 'spaced' && pos - at >= SPACING)
  }
  const text = (t: string): string => {
    if (ctx.mode === 'all') return t
    const out = t.replace(/\*\*\*([^*]+?)\*\*\*/g, (all, name: string, offset: number) => {
      const id = ctx.index.get(name.trim().toLowerCase())
      if (!id) return all
      if (!linkable(id)) return NO_LINK + all
      last.set(id, pos + offset)
      return all
    })
    pos += t.length
    return out
  }
  const heading = (id: string) => void passed.add(id)
  return { text, heading }
}

export function limitTermLinks(blocks: Block[], ctx: TermLinkContext): Block[] {
  const lim = createTermLimiter(ctx)
  const items = (list: ListItem[]): ListItem[] =>
    list.map((i) => ({ ...i, text: lim.text(i.text), ...(i.items ? { items: items(i.items) } : {}) }))
  const walk = (bs: Block[]): Block[] =>
    bs.map((b) => {
      switch (b.type) {
        case 'heading':
          lim.heading(b.id)
          return b
        case 'p':
          return { ...b, text: lim.text(b.text) }
        case 'list':
          return { ...b, items: items(b.items) }
        case 'table':
          return { ...b, rows: b.rows.map((r) => r.map(lim.text)) }
        case 'quote':
        case 'card':
          return { ...b, blocks: walk(b.blocks) }
        default:
          return b
      }
    })
  return walk(blocks)
}

/** Texty bytosti v pořadí zobrazení; pojmy se odkazují podle stejných pravidel jako v kapitole. */
export function limitCreatureLinks(c: Creature, ctx: TermLinkContext): Creature {
  const lim = createTermLimiter(ctx)
  const characteristic = c.characteristic?.note
    ? { ...c.characteristic, note: lim.text(c.characteristic.note) }
    : c.characteristic
  const stats = c.stats.map((s) => ({ ...s, value: lim.text(s.value) }))
  const description = lim.text(c.description)
  const sections = c.sections.map((s) => ({ ...s, text: lim.text(s.text) }))
  return { ...c, characteristic, stats, description, sections }
}
