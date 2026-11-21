import { sha256Hex } from '../hash'
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

const base = () => new URL('packs/', globalThis.document?.baseURI ?? 'http://localhost/').href

/** Jak dlouho smí server mlčet (do hlaviček i mezi částmi dat), než se stahování přeruší. */
export const STALL_MS = 20_000

/**
 * Stáhne soubor s hlídáním „zaseknutí“ (žádná data po dobu `stallMs`) a průběhem v bajtech.
 * Chyby mají čitelný popis: bez připojení, zaseknuto, chyba serveru.
 */
async function get(
  url: string,
  label: string,
  opts: { stallMs?: number; onProgress?: (received: number) => void } = {},
): Promise<{ res: Response; bytes: Uint8Array<ArrayBuffer> }> {
  const stallMs = opts.stallMs ?? STALL_MS
  const ctl = new AbortController()
  let stalled = false
  let timer: ReturnType<typeof setTimeout>
  const arm = () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      stalled = true
      ctl.abort()
    }, stallMs)
  }
  const fail = (err: unknown): never => {
    if (stalled)
      throw new Error(`${label}: server neodpovídá (žádná data po ${Math.round(stallMs / 1000)} s). Zkuste to později.`)
    if (err instanceof Error && err.message.startsWith(label)) throw err
    throw new Error(`${label}: bez připojení k internetu nebo server není dostupný.`)
  }
  arm()
  try {
    const res = await fetch(url, { cache: 'no-cache', signal: ctl.signal })
    if (!res.ok) throw new Error(`${label}: server vrátil chybu ${res.status}.`)
    arm()
    const chunks: Uint8Array[] = []
    let received = 0
    const reader = res.body?.getReader()
    if (reader)
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        received += value.length
        opts.onProgress?.(received)
        arm()
      }
    else {
      const b = new Uint8Array(await res.arrayBuffer())
      chunks.push(b)
      received = b.length
    }
    const bytes = new Uint8Array(received)
    let at = 0
    for (const c of chunks) {
      bytes.set(c, at)
      at += c.length
    }
    return { res, bytes }
  } catch (err) {
    return fail(err)
  } finally {
    clearTimeout(timer!)
  }
}

export async function fetchCatalog(): Promise<CatalogEntry[]> {
  const { res, bytes } = await get(`${base()}index.json`, 'Katalog balíčků')
  // místo JSON může přijít stránka aplikace (záložní odpověď offline cache): čitelná chyba místo „Unexpected token“
  if (res.headers.get('content-type')?.includes('text/html'))
    throw new Error('Katalog balíčků: server vrátil stránku místo katalogu (zkontrolujte připojení).')
  let data: { format?: number; packs?: unknown } | undefined
  try {
    data = JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    data = undefined
  }
  if (!data || data.format !== 1 || !Array.isArray(data.packs)) throw new Error('Neznámý formát katalogu.')
  return data.packs as CatalogEntry[]
}

/** Stáhne balíček, ověří kontrolní součet a nainstaluje ho. `onProgress` dostává počet stažených bajtů. */
export async function downloadPack(
  e: CatalogEntry,
  onProgress?: (received: number) => void,
  stallMs?: number,
): Promise<ContentPack> {
  const { bytes } = await get(`${base()}${e.file}`, `Stažení „${e.name}“`, { stallMs, onProgress })
  if ((await sha256Hex(bytes)) !== e.sha256)
    throw new Error(`Soubor „${e.name}“ je poškozený nebo neodpovídá katalogu. Zkuste to znovu.`)
  return installPack(new TextDecoder().decode(bytes))
}

/** Nabídnout stažení: balíček chybí, nebo má jinou verzi či nižší sestavení. */
export const needsUpdate = (e: CatalogEntry, installed?: ContentPack): boolean =>
  !installed || installed.manifest.version !== e.version || (installed.manifest.build ?? 0) < e.build
