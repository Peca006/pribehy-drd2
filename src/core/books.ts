// Knihy a kapitoly: kniha = obsahový balíček s kapitolami. Pravidla (balíček s povoláními) jdou první,
// ostatní podle `manifest.order` a názvu; kapitoly v knize podle ID.
import type { Chapter, ContentPack, Profession } from './content/schema'

export interface Book {
  id: string
  name: string
  chapters: Chapter[]
  /** kapitoly po částech knihy (viz `groupsOf`) */
  groups: ChapterGroup[]
}

/** Skupina kapitol knihy (část); `name` chybí u kapitol bez části. */
export interface ChapterGroup {
  id: string
  name?: string
  chapters: Chapter[]
}

/**
 * Kapitoly knihy po částech podle `manifest.parts` (pořadí částí z balíčku, kapitoly v části podle ID). Kapitoly
 * bez části nebo s neznámou částí jdou na konec bez nadpisu. Bez částí je jedna skupina bez nadpisu.
 */
export function groupsOf(pack: ContentPack): ChapterGroup[] {
  const sorted = [...(pack.chapters ?? [])].sort((a, b) => a.id.localeCompare(b.id))
  const parts = pack.manifest.parts ?? []
  const groups: ChapterGroup[] = parts
    .map((p) => ({ id: p.id, name: p.name, chapters: sorted.filter((c) => c.part === p.id) }))
    .filter((g) => g.chapters.length)
  const known = new Set(parts.map((p) => p.id))
  const rest = sorted.filter((c) => !c.part || !known.has(c.part))
  if (rest.length) groups.push({ id: '', chapters: rest })
  return groups
}

const rank = (p: ContentPack) => p.manifest.order ?? (p.professions?.length ? 10 : 50)

export function booksOf(packs: ContentPack[]): Book[] {
  return packs
    .filter((p) => p.chapters?.length)
    .sort((a, b) => rank(a) - rank(b) || a.manifest.name.localeCompare(b.manifest.name, 'cs'))
    .map((p) => ({
      id: p.manifest.id,
      name: p.manifest.name,
      chapters: [...(p.chapters ?? [])].sort((a, b) => a.id.localeCompare(b.id)),
      groups: groupsOf(p),
    }))
}

export interface ProfessionBook {
  id: string
  name: string
  professions: Profession[]
}

/** Balíčky, které přinášejí jen povolání (např. mistrovská povolání z Her mocných) a nemají kapitoly: Příručka je ukáže jako samostatnou sekci. */
export function professionBooksOf(packs: ContentPack[]): ProfessionBook[] {
  return packs
    .filter((p) => p.professions?.length && !p.chapters?.length)
    .sort((a, b) => (a.manifest.order ?? 60) - (b.manifest.order ?? 60) || a.manifest.name.localeCompare(b.manifest.name, 'cs'))
    .map((p) => ({ id: p.manifest.id, name: p.manifest.name, professions: p.professions }))
}

/** Krátký název knihy pro tlačítko: bez předpony „Dračí doupě 2 – “ a bez závorky na konci. */
export const shortBookName = (name: string) =>
  name
    .replace(/^Dračí doupě 2\s*[–-]\s*/, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim() || name
