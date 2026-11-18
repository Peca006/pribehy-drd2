import { outdatedPacks } from './builds'
import { needsUpdate, type CatalogEntry } from './remote'
import type { ContentPack } from './schema'

/**
 * Stav balíčku ze SRD vůči aplikaci a katalogu ke stažení:
 * - `missing`: není nainstalovaný,
 * - `outdated`: starší podoba, než aplikace potřebuje (číslo sestavení), je nutné stáhnout znovu,
 * - `update`: v katalogu je novější verze či sestavení,
 * - `ok`: aktuální.
 */
export type PackState = 'missing' | 'outdated' | 'update' | 'ok'

export function packState(entry: CatalogEntry | undefined, installed: ContentPack | undefined): PackState {
  if (!installed) return 'missing'
  if (outdatedPacks([installed]).length) return 'outdated'
  if (entry && needsUpdate(entry, installed)) return 'update'
  return 'ok'
}
