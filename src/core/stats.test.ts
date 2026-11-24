// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STATS_ENDPOINT, STATS_HOST, countEvent, initStats, resetStats, statsAllowed } from './stats'

const host = (hostname: string) => Object.defineProperty(globalThis, 'location', { value: { hostname }, configurable: true })
const dnt = (v: string | null) => Object.defineProperty(navigator, 'doNotTrack', { value: v, configurable: true })
const scripts = () => [...document.head.querySelectorAll('script')]

beforeEach(() => {
  resetStats()
  document.head.innerHTML = ''
  delete (globalThis as { goatcounter?: unknown }).goatcounter
  dnt(null)
})

describe('měření (GoatCounter)', () => {
  it('mimo ostrý web neměří a nic nenačte', () => {
    for (const h of ['localhost', '127.0.0.1', 'jiny.example']) {
      host(h)
      expect(statsAllowed()).toBe(false)
      initStats('0.5.0')
    }
    expect(scripts()).toHaveLength(0)
  })

  it('„Do Not Track“ měření vypne', () => {
    host(STATS_HOST)
    dnt('1')
    initStats('0.5.0')
    expect(scripts()).toHaveLength(0)
  })

  it('na ostrém webu načte skript jednou a události drží ve frontě, dokud se nenačte', () => {
    host(STATS_HOST)
    initStats('0.5.0')
    initStats('0.5.0')
    expect(scripts()).toHaveLength(1)
    expect(scripts()[0].dataset.goatcounter).toBe(STATS_ENDPOINT)

    const count = vi.fn()
    ;(globalThis as { goatcounter?: unknown }).goatcounter = { count }
    countEvent('balicek/zaklad', 'Balíček')
    expect(count).not.toHaveBeenCalled()
    scripts()[0].dispatchEvent(new Event('load'))
    expect(count.mock.calls.map((c) => c[0])).toEqual([
      { path: 'verze/0.5.0', title: 'Verze aplikace', event: true },
      { path: 'balicek/zaklad', title: 'Balíček', event: true },
    ])
    // po načtení se události posílají hned
    countEvent('aktualizace')
    expect(count).toHaveBeenLastCalledWith({ path: 'aktualizace', event: true })
  })

  it('selhání skriptu (offline) nic nerozbije a fronta se zahodí', () => {
    host(STATS_HOST)
    initStats('0.5.0')
    scripts()[0].dispatchEvent(new Event('error'))
    expect(() => countEvent('aktualizace')).not.toThrow()
  })

  it('bez inicializace se události nikam nezapisují', () => {
    host('localhost')
    expect(() => countEvent('balicek/x')).not.toThrow()
  })
})
