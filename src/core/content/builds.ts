// Číslo sestavení balíčků ze SRD. Když se změní to, co z knih převodník vyrábí (struktura kapitol, bytosti, …),
// zvýší se číslo v `src/data/pack-build.json` (čtou ho aplikace i převodník) a aplikace vyzve ke stažení nového balíčku.
import buildNumber from '../../data/pack-build.json'
import type { ContentPack } from './schema'

/** Balíčky, které vznikají převodem SRD, a požadované číslo sestavení. */
export const EXPECTED_BUILD: Record<string, number> = {
  'drd2-pravidla-2': buildNumber.build,
  'drd2-bestiar-2': buildNumber.build,
}

/** Nainstalované balíčky ze SRD ve starším sestavení, než aplikace potřebuje (chybějící číslo = nejstarší). */
export const outdatedPacks = (packs: ContentPack[]): ContentPack[] =>
  packs.filter((p) => {
    const need = EXPECTED_BUILD[p.manifest.id]
    return need !== undefined && (p.manifest.build ?? 0) < need
  })
