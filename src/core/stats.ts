// Anonymní měření používání na ostrém webu přes GoatCounter (bez cookies a bez osobních údajů).
// Měří se jen načtení aplikace, verze a události „stažen balíček“ a „načtena nová verze“. Žádný obsah z aplikace se neposílá.
// Neměří se mimo ostrý web (vývoj, testy), při nastaveném „Do Not Track“ ani offline; selhání skriptu nic nerozbije.
// Skript je z jiné domény a service worker ho neukládá, takže offline se prostě nenačte.

export const STATS_HOST = 'peca006.github.io'
export const STATS_ENDPOINT = 'https://pribehy-drd2.goatcounter.com/count'
export const STATS_SCRIPT = 'https://gc.zgo.at/count.js'

interface GoatCounter {
  count: (vars: { path: string; title?: string; event?: boolean }) => void
}

let loaded = false
let started = false
const queue: { path: string; title?: string }[] = []

function counter(): GoatCounter | undefined {
  const gc = (globalThis as { goatcounter?: Partial<GoatCounter> }).goatcounter
  return typeof gc?.count === 'function' ? (gc as GoatCounter) : undefined
}

/** Smí se na tomto místě měřit? Jen ostrý web, bez „Do Not Track“. */
export function statsAllowed(): boolean {
  if (typeof location === 'undefined' || location.hostname !== STATS_HOST) return false
  const dnt = navigator.doNotTrack ?? (globalThis as { doNotTrack?: string }).doNotTrack
  return dnt !== '1' && dnt !== 'yes'
}

function flush() {
  const gc = counter()
  if (!gc) return
  for (const e of queue.splice(0)) gc.count({ ...e, event: true })
}

/** Načte měřicí skript (jednou) a pošle verzi aplikace. Bez práva měřit nedělá nic. */
export function initStats(version: string): void {
  if (started || !statsAllowed()) return
  started = true
  const s = document.createElement('script')
  s.async = true
  s.src = STATS_SCRIPT
  s.dataset.goatcounter = STATS_ENDPOINT
  s.onload = () => {
    loaded = true
    flush()
  }
  s.onerror = () => queue.splice(0)
  document.head.append(s)
  countEvent(`verze/${version}`, 'Verze aplikace')
}

/** Zapíše událost (např. `balicek/zakladni-prirucka`); před načtením skriptu se drží ve frontě. */
export function countEvent(path: string, title?: string): void {
  if (!started) return
  queue.push({ path, ...(title ? { title } : {}) })
  if (loaded) flush()
}

/** Jen pro testy. */
export function resetStats(): void {
  loaded = false
  started = false
  queue.length = 0
}
