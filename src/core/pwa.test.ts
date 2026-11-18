// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

// `virtual:pwa-register` existuje jen ve sestavení Vite; v testu ho nahradíme
const registerSW = vi.fn()
vi.mock('virtual:pwa-register', () => ({ registerSW: (o: unknown) => registerSW(o) }))

const load = async () => {
  vi.resetModules()
  registerSW.mockReset()
  registerSW.mockReturnValue(async () => {})
  globalThis.matchMedia = ((q: string) => ({ matches: false, media: q })) as typeof matchMedia
  return import('./pwa.svelte')
}

describe('PWA', () => {
  beforeEach(() => vi.useRealTimers())

  it('instalaci nabídne po beforeinstallprompt a po instalaci ji schová', async () => {
    const { initPwa, pwa } = await load()
    initPwa()
    const e = new Event('beforeinstallprompt', { cancelable: true })
    window.dispatchEvent(e)
    expect(e.defaultPrevented).toBe(true)
    expect(pwa.installable).toBe(true)
    window.dispatchEvent(new Event('appinstalled'))
    expect(pwa.installable).toBe(false)
    expect(pwa.installed).toBe(true)
  })

  it('install() bez uložené výzvy vrací false', async () => {
    const { install } = await load()
    expect(await install()).toBe(false)
  })

  it('callbacky service workeru nastaví stav', async () => {
    const { initPwa, pwa } = await load()
    initPwa()
    const opts = registerSW.mock.calls[0][0] as { onNeedRefresh(): void; onOfflineReady(): void }
    opts.onNeedRefresh()
    opts.onOfflineReady()
    expect(pwa.needRefresh).toBe(true)
    expect(pwa.offlineReady).toBe(true)
  })

  it('kontrola aktualizace bez registrace service workeru vrací „nelze“', async () => {
    const { checkForUpdate, pwa } = await load()
    expect(await checkForUpdate()).toBe('nelze')
    expect(pwa.checking).toBe(false)
  })

  it('kontrola ohlásí novou verzi, když čeká, a aktuální, když ne', async () => {
    const { initPwa, checkForUpdate, pwa } = await load()
    initPwa()
    const opts = registerSW.mock.calls[0][0] as {
      onRegisteredSW(url: string, reg: unknown): void
    }
    const reg = { update: vi.fn(async () => {}), installing: null, waiting: null as unknown }
    opts.onRegisteredSW('sw.js', reg)
    expect(await checkForUpdate()).toBe('aktualni')
    expect(reg.update).toHaveBeenCalled()
    reg.waiting = {}
    expect(await checkForUpdate()).toBe('nova')
    expect(pwa.lastChecked).toBeGreaterThan(0)
  })

  it('chyba při kontrole vrací „nelze“ a nezůstane viset příznak kontroly', async () => {
    const { initPwa, checkForUpdate, pwa } = await load()
    initPwa()
    const opts = registerSW.mock.calls[0][0] as { onRegisteredSW(u: string, r: unknown): void }
    opts.onRegisteredSW('sw.js', { update: async () => Promise.reject(new Error('offline')) })
    expect(await checkForUpdate()).toBe('nelze')
    expect(pwa.checking).toBe(false)
  })
})
