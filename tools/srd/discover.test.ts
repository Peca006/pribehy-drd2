import { describe, expect, it } from 'vitest'
import { discoverPages } from './pipeline.mjs'

// Dřív byl regulární výraz v bookmarkletu chybný (`\d` v šabloně), takže se nikdy nic nenašlo a tiše platil pevný seznam.
describe('hledání stránek SRD v odkazech', () => {
  const fallback = ['11-a', '12-b']

  it('najde číslované stránky sekce a seřadí je', () => {
    const hrefs = [
      '/zakladni-prirucka/12-rasy.html',
      'https://drd2srd.d20.cz/zakladni-prirucka/11-co-jsou-hry.html#x',
      '/bestiar/01-uvod.html',
      '/zakladni-prirucka/index.html',
      null,
    ]
    expect(discoverPages(hrefs, 'zakladni-prirucka', fallback)).toEqual(['11-co-jsou-hry', '12-rasy'])
  })

  it('když je nalezených méně než známých, platí pevný seznam', () => {
    expect(discoverPages(['/zakladni-prirucka/11-a.html'], 'zakladni-prirucka', fallback)).toBe(fallback)
    expect(discoverPages([], 'zakladni-prirucka', fallback)).toBe(fallback)
  })
})
