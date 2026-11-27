import { describe, expect, it } from 'vitest'
import { cleanForm, groupForms, stemWord } from './forms.mjs'

const group = (words: Record<string, number>) => {
  const counts = new Map(
    Object.entries(words).map(([k, n]) => [cleanForm(k), n] as [string, number]),
  )
  return groupForms(counts)
}

describe('tvary pojmů v rejstříku', () => {
  it('cleanForm: úroveň, -li, zvratné se, ženské tvary, odpad', () => {
    expect(cleanForm('Bojovník 5')).toBe('bojovník')
    expect(cleanForm('vyčerpá-li')).toBe('vyčerpá')
    expect(cleanForm('vyčerpá se')).toBe('vyčerpá')
    expect(cleanForm('kejklířka 2')).toBe('kejklíř')
    expect(cleanForm('penězích')).toBe('peníze')
    expect(cleanForm('surovina)')).toBe('surovina')
    expect(cleanForm('na')).toBe('')
    expect(cleanForm('manévru lstivě může změnit ohrožení')).toBe('')
    expect(cleanForm('náročnosti, manévrů')).toBe('')
  })

  it('stemWord: střet není „str-et“, slovesa se krátí', () => {
    expect(stemWord('střet').stem).toBe('stret')
    expect(stemWord('vyčerpávat').stem).toBe('vycerpav')
    expect(stemWord('zkoušce').stem).toBe('zkousk')
    expect(stemWord('zkouška').stem).toBe('zkousk')
  })

  it('pády, množné číslo i střídání samohlásek skončí v jedné skupině se základním tvarem', () => {
    const g = group({
      sudba: 19, sudbu: 53, sudby: 59, sudbě: 3, sudeb: 1,
      jizva: 31, jizvy: 125, jizev: 37, jizvou: 8,
      zkouška: 10, zkoušce: 17, zkoušku: 35,
      výzva: 4, výzvě: 27, výzev: 1,
      surovina: 9, surovin: 37, suroviny: 51,
      tělo: 218, těla: 19, těl: 1,
      platba: 10, plateb: 7, platbu: 13,
      vyčerpání: 117, vyčerpat: 74, vyčerpává: 6, vyčerpávat: 15, vyčerpal: 4,
    }) // prettier-ignore
    for (const [a, name] of [
      ['sudbu', 'sudba'],
      ['jizev', 'jizva'],
      ['zkoušce', 'zkouška'],
      ['výzev', 'výzva'],
      ['surovin', 'surovina'],
      ['těl', 'tělo'],
      ['plateb', 'platba'],
      ['vyčerpat', 'vyčerpání'],
    ] as const) {
      expect(g.get(a)!.name, a).toBe(name)
      expect(g.get(a)!.key, a).toBe(g.get(name)!.key)
    }
  })

  it('pevná skupina (pojem a aliasy z balíčku) má přednost před kmeny', () => {
    const counts = new Map([
      ['peníze', 12],
      ['groš', 3],
    ])
    const g = groupForms(counts, [['peníze', 'groš']])
    expect(g.get('groš')!.key).toBe(g.get('peníze')!.key)
  })

  it('nesouvisející slova se nespojí', () => {
    const g = group({
      výzva: 4,
      vyzvědačka: 1,
      hod: 33,
      hodnota: 2,
      střet: 45,
      strach: 1,
      duše: 5,
      dušnost: 1,
    })
    expect(new Set([...g.values()].map((x) => x.key)).size).toBe(8)
  })
})
