// Rejstřík: abecední seznam herních pojmů s odkazem do knihy. Na začátku jsou odkazy na úplný začátek každé knihy.
// U pojmů, jejichž vysvětlení je na více místech, jsou navíc další odkazy v závorce (jako více čísel stránek v knize).
// Další místa se doplňují ručně v `src/data/index-extra.json` (jen ID a kotvy, žádné texty knih).
import type { Book } from './books'
import type { Term } from './content/schema'

export interface IndexRef {
  href: string
  label: string
}

export interface IndexEntry {
  name: string
  main: IndexRef
  also: IndexRef[]
  summary?: string
}

export interface IndexGroup {
  letter: string
  entries: IndexEntry[]
}

/** Ruční doplňky: další místa u pojmů (podle ID pojmu) a vlastní hesla bez pojmu. Cíle jsou `chapter:ID#kotva`. */
export interface IndexExtra {
  terms?: Record<string, string[]>
  entries?: { name: string; targets: string[]; summary?: string }[]
}

/** `chapter:ID#kotva` → odkaz v aplikaci s popiskem „kapitola › oddíl“; neznámá kapitola → undefined. */
export function resolveTarget(target: string, books: Book[]): IndexRef | undefined {
  const m = /^chapter:([^#]+)(?:#(.+))?$/.exec(target)
  if (!m) return undefined
  const chapter = books.flatMap((b) => b.chapters).find((c) => c.id === m[1])
  if (!chapter) return undefined
  const head = m[2]
    ? chapter.blocks.find((b) => b.type === 'heading' && b.id === m[2])
    : undefined
  return {
    href: '#/ctenar/' + m[1] + (m[2] ? '/' + m[2] : ''),
    label: head && head.type === 'heading' ? `${chapter.title} › ${head.text}` : chapter.title,
  }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const letterOf = (name: string) => (/^ch/i.test(name) ? 'Ch' : name.charAt(0).toUpperCase())

export function buildRejstrik(
  terms: Term[],
  books: Book[],
  extra: IndexExtra = {},
): { starts: IndexRef[]; groups: IndexGroup[] } {
  const starts: IndexRef[] = books
    .filter((b) => b.chapters.length)
    .map((b) => ({ href: '#/ctenar/' + b.chapters[0].id, label: b.name }))

  const entries: IndexEntry[] = []
  const add = (name: string, targets: string[], summary?: string) => {
    const refs = targets.map((t) => resolveTarget(t, books)).filter((r): r is IndexRef => !!r)
    if (!refs.length) return
    const [main, ...rest] = refs
    const seen = new Set([main.href])
    const also = rest.filter((r) => !seen.has(r.href) && seen.add(r.href))
    const text = summary?.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\*+/g, '')
    entries.push({ name: cap(name), main, also, ...(text ? { summary: text } : {}) })
  }
  for (const t of terms) add(t.name, [t.target, ...(extra.terms?.[t.id] ?? [])], t.summary)
  for (const e of extra.entries ?? []) add(e.name, e.targets, e.summary)

  entries.sort((a, b) => a.name.localeCompare(b.name, 'cs'))
  const groups: IndexGroup[] = []
  for (const e of entries) {
    const letter = letterOf(e.name)
    const last = groups[groups.length - 1]
    if (last?.letter === letter) last.entries.push(e)
    else groups.push({ letter, entries: [e] })
  }
  return { starts, groups }
}
