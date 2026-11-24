// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { applyTheme, type Theme } from './theme'

const theme = (id: string, tokens: Theme['tokens']): Theme => ({
  id,
  name: id,
  scheme: 'dark',
  tokens,
})

describe('applyTheme', () => {
  it('nastaví téma, schéma a všechny proměnné', () => {
    const root = document.createElement('div')
    applyTheme(theme('a', { '--drd-bg': '#111', '--drd-gap': '1rem' }), root)
    expect(root.dataset.theme).toBe('a')
    expect(root.style.colorScheme).toBe('dark')
    expect(root.style.getPropertyValue('--drd-bg')).toBe('#111')
    expect(root.style.getPropertyValue('--drd-gap')).toBe('1rem')
  })

  it('při změně tématu odebere proměnné, které nové téma nenastavuje (obrázky rolí nezůstanou viset)', () => {
    const root = document.createElement('div')
    applyTheme(
      theme('s-obrazky', {
        '--drd-bg': '#111',
        '--drd-panel-bi-source': 'url("blob:x")',
        '--drd-background-image': 'url("blob:y")',
      }),
      root,
    )
    expect(root.style.getPropertyValue('--drd-panel-bi-source')).toBe('url("blob:x")')
    applyTheme(theme('bez', { '--drd-bg': '#222' }), root)
    expect(root.style.getPropertyValue('--drd-bg')).toBe('#222')
    expect(root.style.getPropertyValue('--drd-panel-bi-source')).toBe('')
    expect(root.style.getPropertyValue('--drd-background-image')).toBe('')
  })

  it('proměnné, které nové téma má, se přepíšou a ostatní prvky se neovlivní', () => {
    const a = document.createElement('div')
    const b = document.createElement('div')
    applyTheme(theme('t1', { '--drd-bg': '#111', '--drd-extra': '1' }), a)
    applyTheme(theme('t1', { '--drd-bg': '#111', '--drd-extra': '1' }), b)
    applyTheme(theme('t2', { '--drd-bg': '#333' }), a)
    expect(a.style.getPropertyValue('--drd-extra')).toBe('')
    expect(b.style.getPropertyValue('--drd-extra')).toBe('1') // jiný kořen zůstal
  })

  it('opakované použití téhož tématu nic neodebírá', () => {
    const root = document.createElement('div')
    const t = theme('t', { '--drd-bg': '#111', '--drd-panel-image': 'url("blob:z")' })
    applyTheme(t, root)
    applyTheme(t, root)
    expect(root.style.getPropertyValue('--drd-panel-image')).toBe('url("blob:z")')
  })
})
