import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { BASIC, chapterOf, helpTopic, helpTopics, linkOf, skillsOf, srdOf } from './help'

const card = (id: string) => BASIC.find((c) => c.id === id)!

describe('postup vyhodnocení: dovednosti a odkaz do SRD', () => {
  it('odkaz do SRD odpovídá odkazu do příručky', () => {
    expect(linkOf(card('vyroba'))).toBe('#/ctenar/35-pouzivani-dovednosti/vyroba')
    expect(srdOf(card('vyroba'))).toBe('https://drd2srd.d20.cz/zakladni-prirucka/35-pouzivani-dovednosti.html#vyroba')
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

describe('registr témat nápovědy', () => {
  it('ID témat jsou jedinečná a každé téma má kroky', () => {
    const ids = helpTopics().map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const c of helpTopics()) expect(c.steps.length, c.id).toBeGreaterThan(0)
    expect(helpTopic('suroviny')?.title).toBe('Suroviny')
    expect(helpTopic('neexistuje')).toBeUndefined()
  })

  it('odkazy míří na kapitoly a kotvy ve zveřejněném balíčku pravidel', () => {
    const pack = JSON.parse(readFileSync('content-packs/srd/drd2-pravidla-2.json', 'utf8')) as {
      chapters: { id: string; blocks: unknown[] }[]
    }
    const anchors = (blocks: unknown[]): string[] =>
      blocks.flatMap((b) => {
        const x = b as { type?: string; id?: string; blocks?: unknown[]; children?: unknown[]; items?: unknown[] }
        const own = x.type === 'heading' && x.id ? [x.id] : []
        const inner = [x.blocks, x.children, x.items].filter(Array.isArray).flatMap((a) => anchors(a as unknown[]))
        return [...own, ...inner]
      })
    const byId = new Map(pack.chapters.map((c) => [c.id, new Set(anchors(c.blocks))]))
    for (const c of helpTopics()) {
      const l = linkOf(c)
      if (!l) continue
      const [, chapter, anchor] = /^#\/ctenar\/([^/]+)(?:\/(.+))?$/.exec(l)!
      expect(byId.has(chapter), `${c.id}: kapitola ${chapter}`).toBe(true)
      if (anchor) expect(byId.get(chapter)!.has(anchor), `${c.id}: kotva ${anchor}`).toBe(true)
    }
  })
})
