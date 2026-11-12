// Aplikace jako PWA: aktualizace nové verze a instalace na plochu.
//
// Aktualizace: service worker stáhne novou verzi na pozadí; `needRefresh` pak nabídne „Obnovit“ (uživatel si
// vybere okamžik, rozepsané návrhy jsou uložené v zařízení). Kontrola proběhne při spuštění, po návratu do aplikace
// a každou hodinu, nebo na požádání tlačítkem.
//
// Instalace: Chrome/Edge (Android i počítač) pošle `beforeinstallprompt`, který lze vyvolat vlastním tlačítkem;
// iOS Safari událost nemá, tam se ukáže návod (Sdílet → Přidat na plochu).
import { registerSW } from 'virtual:pwa-register'

export const pwa = $state({
  /** čeká nová verze, stačí obnovit */
  needRefresh: false,
  /** aplikace je připravená pro práci offline (první nainstalování service workeru) */
  offlineReady: false,
  /** právě se kontroluje nová verze */
  checking: false,
  /** poslední kontrola nové verze (ms) */
  lastChecked: 0,
  /** prohlížeč nabízí instalaci vlastním tlačítkem */
  installable: false,
  /** aplikace už běží jako nainstalovaná (samostatné okno) */
  installed: false,
  /** iOS Safari: instalace jen ručně přes Sdílet */
  ios: false,
})

let registration: ServiceWorkerRegistration | undefined
let updateSW: ((reload?: boolean) => Promise<void>) | undefined
let deferred: BeforeInstallPromptEvent | undefined

const standalone = () =>
  matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

export function initPwa() {
  pwa.installed = standalone()
  pwa.ios =
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    pwa.installable = !pwa.installed
  })
  addEventListener('appinstalled', () => {
    deferred = undefined
    pwa.installable = false
    pwa.installed = true
  })

  updateSW = registerSW({
    immediate: true,
    onNeedRefresh: () => (pwa.needRefresh = true),
    onOfflineReady: () => (pwa.offlineReady = true),
    onRegisteredSW: (_url, reg) => {
      registration = reg
      setInterval(() => void checkForUpdate(), 60 * 60 * 1000)
    },
  })

  // po návratu do aplikace (telefon, který byl dlouho v pozadí) se nová verze hledá znovu, nejvýš co 10 minut
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - pwa.lastChecked > 10 * 60 * 1000)
      void checkForUpdate()
  })
}

/** Zeptá se serveru na novou verzi. Vrací, co se zjistilo (nová verze se pak ohlásí přes `needRefresh`). */
export async function checkForUpdate(): Promise<'nova' | 'aktualni' | 'nelze'> {
  if (!registration) return 'nelze'
  pwa.checking = true
  try {
    await registration.update()
    pwa.lastChecked = Date.now()
    // nová verze se stahuje na pozadí: krátce počkáme, než se objeví jako čekající
    for (let i = 0; i < 20 && !pwa.needRefresh && (registration.installing || i < 2); i++)
      await new Promise((r) => setTimeout(r, 300))
    return pwa.needRefresh || registration.waiting ? 'nova' : 'aktualni'
  } catch {
    return 'nelze'
  } finally {
    pwa.checking = false
  }
}

/** Aktivuje čekající verzi a stránku obnoví. */
export async function applyUpdate() {
  if (updateSW) await updateSW(true)
  else location.reload()
}

/** Vyvolá systémový dialog instalace; `true`, pokud ji uživatel potvrdil. */
export async function install(): Promise<boolean> {
  if (!deferred) return false
  await deferred.prompt()
  const { outcome } = await deferred.userChoice
  deferred = undefined
  pwa.installable = false
  return outcome === 'accepted'
}
