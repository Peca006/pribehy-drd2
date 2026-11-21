import { describe, expect, it } from 'vitest'
import { BASIC, chapterOf, linkOf, skillsOf, srdOf } from './guide'

const card = (id: string) => BASIC.find((c) => c.id === id)!

describe('postup vyhodnocení: dovednosti a odkaz do SRD', () => {
  it('odkaz do SRD odpovídá odkazu do příručky', () => {
    expect(linkOf(card('vyroba'))).toBe('#/ctenar/35-pouzivani-dovednosti')
    expect(srdOf(card('vyroba'))).toBe('https://drd2srd.d20.cz/zakladni-prirucka/35-pouzivani-dovednosti.html')
    expect(srdOf({ id: 'x', title: 'x', steps: [], link: 'hrstka-a-houf' })).toBe(
      'https://drd2srd.d20.cz/zakladni-prirucka/32-slozitejsi-situace.html#hrstka-a-houf',
    )
    expect(srdOf({ id: 'x', title: 'x', steps: [] })).toBeUndefined()
  })

  it('názvy dovedností z balíčku, nenalezené se vynechají; bez balíčku nic', () => {
    const professions = [
      {
        name: 'Alchymista',
        skills: [
          { id: 'dovednost:alchymista/vyroba-elixiru', name: 'Výroba elixírů', attribute: 'Duše' },
          { id: 'dovednost:alchymista/pouzivani-elixiru', name: 'Používání elixírů', attributeNote: 'podle akce' },
        ],
      },
    ]
    expect(skillsOf(card('leceni'), professions).map((s) => [s.name, s.attribute, s.profession])).toEqual([
      ['Výroba elixírů', 'Duše', 'Alchymista'],
      ['Používání elixírů', 'podle akce', 'Alchymista'],
    ])
    expect(skillsOf(card('leceni'), [])).toEqual([])
  })
})

describe('karta Kouzla', () => {
  it('míří do kapitoly o kouzlech a má kroky', () => {
    expect(chapterOf(card('kouzla'))).toBe('36-kouzla-nastrahy-leceni')
    expect(card('kouzla').steps.length).toBeGreaterThan(3)
  })
})

describe('cíl odkazu do příručky', () => {
  it('chapterOf vrací ID kapitoly, i u odkazu s kotvou', () => {
    expect(chapterOf(card('vyroba'))).toBe('35-pouzivani-dovednosti')
    expect(chapterOf({ id: 'x', title: 'x', steps: [], link: 'hrstka-a-houf' })).toBe('32-slozitejsi-situace')
    expect(chapterOf({ id: 'x', title: 'x', steps: [] })).toBeUndefined()
  })
})
