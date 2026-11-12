// Omezení počtu odkazů z pojmů (***pojem***) v textu kapitoly: odkaz má jen první výskyt pojmu v kapitole
// a žádný pojem, jehož vysvětlení je v téže kapitole (odkaz na sebe sama nic nepřináší). Ostatní výskyty se
// zobrazí stejně (tučná kurzíva), ale bez odkazu – k tomu slouží značka `NO_LINK` v textu.
import type { Block, ListItem } from './content/schema'
import { NO_LINK } from './markdown'

export interface TermLinkContext {
  /** tvar pojmu (malými písmeny) → ID pojmu */
  index: Map<string, string>
  /** ID pojmu → ID kapitoly, ve které je vysvětlen */
  homeChapter: (termId: string) => string | undefined
  chapterId: string
}

export function limitTermLinks(blocks: Block[], ctx: TermLinkContext): Block[] {
  const seen = new Set<string>()
  const text = (t: string) =>
    t.replace(/\*\*\*([^*]+?)\*\*\*/g, (all, name: string) => {
      const id = ctx.index.get(name.trim().toLowerCase())
      if (!id) return all
      if (seen.has(id) || ctx.homeChapter(id) === ctx.chapterId) return NO_LINK + all
      seen.add(id)
      return all
    })
  const items = (list: ListItem[]): ListItem[] =>
    list.map((i) => ({ ...i, text: text(i.text), ...(i.items ? { items: items(i.items) } : {}) }))
  const walk = (bs: Block[]): Block[] =>
    bs.map((b) => {
      switch (b.type) {
        case 'p':
          return { ...b, text: text(b.text) }
        case 'list':
          return { ...b, items: items(b.items) }
        case 'table':
          return { ...b, rows: b.rows.map((r) => r.map(text)) }
        case 'quote':
        case 'card':
          return { ...b, blocks: walk(b.blocks) }
        default:
          return b
      }
    })
  return walk(blocks)
}
