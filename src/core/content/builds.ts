// Číslo sestavení balíčků ze SRD. Když se změní to, co z knih převodník vyrábí (struktura kapitol, bytosti, …),
// zvýší se číslo tady i v `tools/srd/pipeline.mjs` (hlídá test) a aplikace vyzve k novému převodu a načtení.
import type { ContentPack } from './schema'

/** Balíčky, které vznikají převodem SRD, a požadované číslo sestavení. */
export const EXPECTED_BUILD: Record<string, number> = {
  'drd2-pravidla-2': 2,
  'drd2-bestiar-2': 2,
}

/** Nainstalované balíčky ze SRD ve starším sestavení, než aplikace potřebuje (chybějící číslo = nejstarší). */
export const outdatedPacks = (packs: ContentPack[]): ContentPack[] =>
  packs.filter((p) => {
    const need = EXPECTED_BUILD[p.manifest.id]
    return need !== undefined && (p.manifest.build ?? 0) < need
  })
