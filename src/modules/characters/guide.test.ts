import { describe, expect, it } from 'vitest'
import { BASIC, linkOf, skillsOf, srdOf } from './guide'

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
