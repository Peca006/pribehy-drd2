import { installPack } from './store'
import type { ContentPack } from './schema'

// Stahování balíčků ze SRD z webu aplikace (složka packs/ vedle aplikace, viz content-packs/srd/README.md).
export interface CatalogEntry {
  id: string
  name: string
  version: string
  build: number
  file: string
  size: number
  sha256: string
}

const base = () => new URL('packs/', document.baseURI).href

const hex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

export async function fetchCatalog(): Promise<CatalogEntry[]> {
  const res = await fetch(`${base()}index.json`, { cache: 'no-cache' })
  if (!res.ok) throw new Error('Katalog balíčků se nepodařilo načíst.')
  const data = await res.json()
  if (!data || data.format !== 1 || !Array.isArray(data.packs)) throw new Error('Neznámý formát katalogu.')
  return data.packs
}

/** Stáhne balíček, ověří kontrolní součet a nainstaluje ho. */
export async function downloadPack(e: CatalogEntry): Promise<ContentPack> {
  const res = await fetch(`${base()}${e.file}`, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`Stažení „${e.name}“ se nezdařilo.`)
  const buf = await res.arrayBuffer()
  if (hex(await crypto.subtle.digest('SHA-256', buf)) !== e.sha256)
    throw new Error(`Soubor „${e.name}“ je poškozený nebo neodpovídá katalogu. Zkuste to znovu.`)
  return installPack(new TextDecoder().decode(buf))
}

/** Nabídnout stažení: balíček chybí, nebo má jinou verzi či nižší sestavení. */
export const needsUpdate = (e: CatalogEntry, installed?: ContentPack): boolean =>
  !installed || installed.manifest.version !== e.version || (installed.manifest.build ?? 0) < e.build
