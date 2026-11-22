import { describe, expect, it } from 'vitest'
import { shareFileName } from './shareFile'

describe('název sdíleného souboru', () => {
  it('jméno bez diakritiky a mezer', () => {
    expect(shareFileName('postava', 'Brokan Rudovous')).toBe('postava-brokan-rudovous.drd2.txt')
    expect(shareFileName('druzina', 'Šedí Vlci!')).toBe('druzina-sedi-vlci.drd2.txt')
  })
  it('prázdné jméno dá obecný název, dlouhé se zkrátí', () => {
    expect(shareFileName('postava', '  ')).toBe('postava-drd2.drd2.txt')
    expect(shareFileName('postava', 'a'.repeat(100)).length).toBeLessThan(60)
  })
})
