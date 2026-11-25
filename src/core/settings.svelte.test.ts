// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Výchozí vzhled je Háv „Podzemí“; uložená volba uživatele se respektuje.
async function load() {
  vi.resetModules()
  return (await import('./settings.svelte')).settings
}

describe('výchozí vzhled', () => {
  beforeEach(() => localStorage.clear())

  it('bez uložené volby je Podzemí', async () => {
    expect((await load()).skin).toBe('podzemi')
  })

  it('uložená volba „Podle systému“ i jiný Háv se respektují', async () => {
    localStorage.setItem('drd2-settings', JSON.stringify({ skin: 'system' }))
    expect((await load()).skin).toBe('system')
    localStorage.setItem('drd2-settings', JSON.stringify({ skin: 'noc' }))
    expect((await load()).skin).toBe('noc')
  })

  it('poškozená hodnota dá výchozí vzhled', async () => {
    localStorage.setItem('drd2-settings', JSON.stringify({ skin: 'Neplatné id!' }))
    expect((await load()).skin).toBe('podzemi')
  })
})
