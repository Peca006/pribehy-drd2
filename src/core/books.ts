// Knihy a kapitoly: kniha = obsahový balíček s kapitolami. Pravidla (balíček s povoláními) jdou první,
// ostatní podle `manifest.order` a názvu; kapitoly v knize podle ID.
import type { Chapter, ContentPack, Profession } from './content/schema'

export interface Book {
  id: string
  name: string
  chapters: Chapter[]
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
