import { refreshLibrary, library } from '../library.svelte'
import { downloadPack, fetchCatalog, needsUpdate, type CatalogEntry } from './remote'

// Sdílený stav stahování balíčků ze SRD (katalog z webu aplikace): používá ho nabídka při prvním spuštění,
// pruh o aktualizaci, stránka Obsahové balíčky i tlačítka „Stáhnout“ všude, kde balíček chybí.
export const downloads = $state<{
  catalog: CatalogEntry[] | null
  error: string
  busy: boolean
  /** id právě stahovaného balíčku */
  current: string
  /** průběh celého stahování v procentech (podle velikostí z katalogu) */
  percent: number
}>({ catalog: null, error: '', busy: false, current: '', percent: 0 })

let loading: Promise<void> | undefined

/** Načte katalog (jednou; opakované volání vrací tentýž příslib, dokud se nezdaří). */
export function loadCatalog(): Promise<void> {
  loading ??= fetchCatalog().then(
    (c) => {
      downloads.catalog = c
      downloads.error = ''
    },
    (err) => {
      downloads.error = err instanceof Error ? err.message : String(err)
      loading = undefined
    },
  )
  return loading
}

const installed = (id: string) => library.packs.find((p) => p.manifest.id === id)

/** Položky katalogu, které chybí nebo mají novější verzi. */
export const pending = (): CatalogEntry[] =>
  (downloads.catalog ?? []).filter((e) => needsUpdate(e, installed(e.id)))

/** Je dostupný katalog s alespoň jedním balíčkem? */
export const canDownload = (): boolean => !!downloads.catalog?.length

/** Stáhne zadané položky (výchozí: všechny chybějící a zastaralé) a obnoví knihovnu. */
export async function download(entries: CatalogEntry[] = pending()): Promise<void> {
  if (downloads.busy) return
  downloads.busy = true
  downloads.error = ''
  downloads.percent = 0
  const total = entries.reduce((n, e) => n + e.size, 0) || 1
  let done = 0
  try {
    for (const e of entries) {
      downloads.current = e.id
      await downloadPack(e, (got) => {
        downloads.percent = Math.min(99, Math.round(((done + got) / total) * 100))
      })
      done += e.size
    }
  } catch (err) {
    downloads.error = err instanceof Error ? err.message : String(err)
  } finally {
    downloads.busy = false
    downloads.current = ''
    downloads.percent = 0
    await refreshLibrary()
  }
}

export const sizeMb = (entries: CatalogEntry[]): string =>
  (Math.round((entries.reduce((n, e) => n + e.size, 0) / 1024 / 1024) * 10) / 10).toString().replace('.', ',')
