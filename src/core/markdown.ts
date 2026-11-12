// Mini-markdown textů obsahových balíčků -> inline tokeny (bez HTML, tedy bez rizika vložení kódu).

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'em' | 'strong'; c: Inline[] }
  /** pojem ze sazby ***…***; `plain` = bez odkazu (viz `limitTermLinks`) */
  | { t: 'term'; c: Inline[]; plain?: boolean }
  | { t: 'link'; href: string; c: Inline[] }

const MARKS: [string, 'term' | 'strong' | 'em'][] = [
  ['***', 'term'],
  ['**', 'strong'],
  ['*', 'em'],
]

/** Neviditelný znak (word joiner) před ***pojmem***: pojem se zobrazí bez odkazu. */
export const NO_LINK = '⁠'

export function parseInline(src: string): Inline[] {
  const out: Inline[] = []
  let buf = ''
  const flush = () => {
    if (buf) out.push({ t: 'text', v: buf })
    buf = ''
  }
  let i = 0
  outer: while (i < src.length) {
    if (src[i] === '[') {
      const m = /^\[([^\]]*)\]\(([^)\s]+)\)/.exec(src.slice(i))
      if (m) {
        flush()
        out.push({ t: 'link', href: m[2], c: parseInline(m[1]) })
        i += m[0].length
        continue
      }
    }
    for (const [mark, t] of MARKS) {
      if (!src.startsWith(mark, i) || /\s/.test(src[i + mark.length] ?? ' ')) continue
      // uzavírací značka nesmí následovat po mezeře (jako ve flanking pravidlech CommonMarku)
      let end = src.indexOf(mark, i + mark.length)
      while (end > 0 && /\s/.test(src[end - 1])) end = src.indexOf(mark, end + 1)
      if (end > i + mark.length) {
        // značka NO_LINK těsně před ***pojmem*** říká, že se z něj nemá dělat odkaz
        const plain = t === 'term' && buf.endsWith(NO_LINK)
        if (plain) buf = buf.slice(0, -NO_LINK.length)
        flush()
        const c = parseInline(src.slice(i + mark.length, end))
        out.push(plain ? { t: 'term', c, plain } : { t, c })
        i = end + mark.length
        continue outer
      }
    }
    buf += src[i++]
  }
  flush()
  return out
}
