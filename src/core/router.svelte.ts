// Jednoduchý směrovač nad `location.hash`: `#/modul/parametr/…`. Tlačítko „Zpět“ prohlížeče
// i telefonu tak funguje samo a každé místo v aplikaci má odkaz, který lze sdílet či uložit.
import {
  emptyNav,
  getScroll,
  lastHash,
  NAV_KEY,
  parseNav,
  remember,
  setScroll,
  type NavState,
} from './nav'

export interface Route {
  module: string
  params: string[]
}

export const parseHash = (hash: string): Route => {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent)
  return { module: parts[0] ?? '', params: parts.slice(1) }
}

export const toHash = (module: string, ...params: string[]): string =>
  '#/' + [module, ...params].map(encodeURIComponent).join('/')

export const router = $state<Route>({ module: '', params: [] })

// Paměť navigace: poslední adresa v každé sekci a poslední posun stránky (viz `nav.ts`).
let nav: NavState = emptyNav()
// čítač změn paměti, aby se odkazy záložek přepočítaly (sama paměť není reaktivní)
const navVersion = $state({ n: 0 })
// po návratu přes záložku nebo tlačítko Zpět se obnoví posun, jinak se nová stránka otevře nahoře
let restoreNext = false
let restoreTimer: ReturnType<typeof setTimeout> | undefined

const persist = () => {
  try {
    localStorage.setItem(NAV_KEY, JSON.stringify(nav))
  } catch {
    /* bez paměti navigace to funguje, jen se nepamatuje */
  }
}

/** Příští změna adresy je návrat (záložka, Zpět): obnoví se posun stránky. */
export function markRestore() {
  restoreNext = true
  clearTimeout(restoreTimer)
  // kdyby žádná změna adresy nenastala (stejná stránka), příznak nezůstane viset
  restoreTimer = setTimeout(() => (restoreNext = false), 600)
}

/** Kam vede záložka modulu: aktivní záložka na kořen modulu, ostatní na poslední otevřenou stránku. */
export const tabHref = (module: string, activeModule: string | undefined): string => {
  void navVersion.n
  return module === activeModule ? toHash(module) : lastHash(nav, module)
}

function restoreScroll(y: number) {
  if (y <= 0) return
  let tries = 0
  const step = () => {
    window.scrollTo(0, y)
    // stránka se může dokreslovat (načítání z úložiště): zkoušíme až do vteřiny
    if (Math.abs(window.scrollY - y) > 2 && ++tries < 20) setTimeout(step, 50)
  }
  setTimeout(step, 0)
}

// adresa, na které stránka právě je (její posun se uloží při odchodu)
let currentHash = ''

function sync() {
  // při změně adresy je ve stránce ještě starý obsah: uložíme její posun
  if (currentHash) setScroll(nav, currentHash, window.scrollY)
  const hash = location.hash
  currentHash = hash
  const r = parseHash(hash)
  const saved = getScroll(nav, hash)
  router.module = r.module
  router.params = r.params
  remember(nav, hash)
  navVersion.n += 1
  persist()
  // nová stránka začíná nahoře; po návratu se pak posune na uložené místo
  window.scrollTo(0, 0)
  if (restoreNext) {
    restoreNext = false
    restoreScroll(saved)
  }
}

export function startRouter() {
  try {
    nav = parseNav(localStorage.getItem(NAV_KEY))
  } catch {
    nav = emptyNav()
  }
  sync()
  addEventListener('hashchange', sync)
  // při zavření nebo skrytí aplikace se uloží i posun aktuální stránky
  const save = () => {
    setScroll(nav, location.hash, window.scrollY)
    persist()
  }
  addEventListener('pagehide', save)
  document.addEventListener(
    'visibilitychange',
    () => document.visibilityState === 'hidden' && save(),
  )
  // tlačítko Zpět (i na telefonu) vrací na místo, kde hráč skončil
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).navigation?.addEventListener('navigate', (e: any) => {
    if (e.navigationType === 'traverse') markRestore()
  })
}

export const go = (module: string, ...params: string[]) => {
  location.hash = toHash(module, ...params)
}
export const back = () => {
  markRestore()
  history.back()
}
