// Fulltext v nainstalovaných knihách: kapitoly (po oddílech podle nadpisů), bytosti a pojmy.
// Index se staví v zařízení z balíčků; hledání ignoruje diakritiku a velikost písmen a vyžaduje všechna slova.
import type { Block, ContentPack, ListItem } from './content/schema'

export type HitKind = 'kapitola' | 'bytost' | 'pojem'

export interface Entry {
  kind: HitKind
  /** odkaz v aplikaci */
  href: string
  /** nadpis výsledku, např. „Základní pravidla › Přesné“ */
  title: string
  /** popis místa, např. název knihy */
  where: string
  text: string
  /** normalizovaný `title` a `text` (bez diakritiky, malá písmena) */
  nTitle: string
  nText: string
}

export interface Hit {
  entry: Entry
  score: number
  /** úryvek rozdělený na části, `hit` = zvýrazněné slovo */
  snippet: { t: string; hit: boolean }[]
}

export const norm = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

const plain = (s: string) =>
  s
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*+/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const items = (list: ListItem[]): string[] =>
  list.flatMap((li) => [plain(li.text), ...items(li.items ?? [])])

function blockTexts(b: Block): string[] {
  switch (b.type) {
    case 'p':
      return [plain(b.text)]
    case 'list':
      return items(b.items)
    case 'quote':
      return b.blocks.flatMap(blockTexts)
    case 'card':
      return [plain(b.title), ...b.blocks.flatMap(blockTexts)]
    case 'table':
      return [b.header.join(' '), ...b.rows.map((r) => r.join(' '))].map(plain)
    default:
      return []
  }
}

const entry = (e: Omit<Entry, 'nTitle' | 'nText'>): Entry => ({
  ...e,
  nTitle: norm(e.title),
  nText: norm(e.text),
})

/** Kapitoly se dělí na oddíly po nadpisech (odkaz skáče na kotvu), bytosti a pojmy jsou po jednom záznamu. */
export function buildIndex(packs: ContentPack[]): Entry[] {
  const out: Entry[] = []
  for (const p of packs) {
    const book = p.manifest.name
    for (const c of p.chapters ?? []) {
      let head = ''
      let anchor = ''
      let buf: string[] = []
      const flush = () => {
        const text = buf.filter(Boolean).join(' ')
        if (text || head)
          out.push(
            entry({
              kind: 'kapitola',
              href: '#/ctenar/' + c.id + (anchor ? '/' + anchor : ''),
              title: head ? `${c.title} › ${head}` : c.title,
              where: book,
              text,
            }),
          )
        buf = []
      }
      for (const b of c.blocks) {
        if (b.type === 'heading') {
          flush()
          head = b.text
          anchor = b.id
        } else buf.push(...blockTexts(b))
      }
      flush()
    }
    for (const c of p.creatures ?? [])
      out.push(
        entry({
          kind: 'bytost',
          href: '#/bestiar/' + encodeURIComponent(c.id),
          title: c.name,
          where: 'Bestiář',
          text: plain(
            [
              c.description,
              ...c.stats.map((s) => `${s.label}: ${s.value}`),
              ...c.sections.map((s) => `${s.title}: ${s.text}`),
            ].join(' '),
          ),
        }),
      )
    for (const t of p.terms ?? []) {
      const m = /^chapter:([^#]+)(?:#(.+))?$/.exec(t.target)
      if (!m) continue
      out.push(
        entry({
          kind: 'pojem',
          href: '#/ctenar/' + m[1] + (m[2] ? '/' + m[2] : ''),
          title: t.name,
          where: 'Pojem',
          text: plain([...(t.aliases ?? []), t.summary ?? ''].join(' ')),
        }),
      )
    }
  }
  return out
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function snippetOf(text: string, nText: string, tokens: string[]): Hit['snippet'] {
  const found = tokens.map((t) => nText.indexOf(t)).filter((i) => i >= 0)
  const at = found.length ? Math.min(...found) : 0
  const from = Math.max(0, at - 50)
  const raw = text.slice(from, from + 200)
  const n = norm(raw)
  const lead = from ? [{ t: '…', hit: false }] : []
  const tail = from + 200 < text.length ? [{ t: '…', hit: false }] : []
  // normalizace může změnit délku textu; pak úryvek ukážeme bez zvýraznění
  if (n.length !== raw.length) return [...lead, { t: raw, hit: false }, ...tail]
  const parts: Hit['snippet'] = []
  let last = 0
  for (const m of n.matchAll(new RegExp(tokens.map(escapeRe).join('|'), 'g'))) {
    if (m.index > last) parts.push({ t: raw.slice(last, m.index), hit: false })
    parts.push({ t: raw.slice(m.index, m.index + m[0].length), hit: true })
    last = m.index + m[0].length
  }
  if (last < raw.length) parts.push({ t: raw.slice(last), hit: false })
  return [...lead, ...parts, ...tail]
}

/** Záznamy obsahující všechna slova dotazu; shoda v nadpisu váží víc než v textu. */
export function search(index: Entry[], query: string, limit = 60): Hit[] {
  const q = norm(query).trim()
  const tokens = q.split(/\s+/).filter(Boolean)
  if (q.length < 2) return []
  const hits: Hit[] = []
  for (const e of index) {
    let score = 0
    let ok = true
    for (const t of tokens) {
      const inTitle = e.nTitle.includes(t)
      const inText = e.nText.includes(t)
      if (!inTitle && !inText) {
        ok = false
        break
      }
      score += (inTitle ? 10 : 0) + (inText ? 1 : 0)
    }
    if (!ok) continue
    if (tokens.length > 1 && e.nText.includes(q)) score += 5
    if (e.kind === 'pojem') score += 2
    hits.push({ entry: e, score, snippet: [] })
  }
  hits.sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title, 'cs'))
  const top = hits.slice(0, limit)
  for (const h of top) h.snippet = snippetOf(h.entry.text, h.entry.nText, tokens)
  return top
}
