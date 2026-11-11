import { describe, expect, it } from 'vitest'
// @ts-expect-error – JS modul bez typů
import { parseProfessions, parseTitle } from './parse-povolani.mjs'
import { validatePack } from '../../src/core/content/validate'
import type { ContentPack, Profession } from '../../src/core/content/schema'

// Vymyšlený text – záměrně nejde o obsah pravidel.
const HTML = `<main><div vp-content><div id="content">
<h1>Povolání</h1>
<h2 id="x">Zkušební&nbsp;hrdina</h2>
<p>Úvodní <em>odstavec</em>.</p>
<h3>Dovednosti</h3>
<h4>Lezení (Tělo)</h4><ul><li>šplhání po <em>zdech</em></li></ul>
<h3>Zvláštní schopnosti</h3>
<h4>Šplhavec (Tělo, rychlá volba: Úroveň 3)</h4>
<p><em><strong>Vylezl by i na hladkou skálu.</strong></em></p>
<p>Postava získá <strong><em>Výhodu</em></strong>.</p>
</div></div></main>`

describe('parseTitle', () => {
  it('rozpozná vlastnost a úroveň rychlé volby', () => {
    expect(parseTitle('Gladiátor (Tělo, rychlá volba: Úroveň 3)')).toEqual({
      name: 'Gladiátor',
      attribute: 'Tělo',
      quickPickLevel: 3,
    })
    expect(parseTitle('Silák (Tělo)')).toEqual({
      name: 'Silák',
      attribute: 'Tělo',
      quickPickLevel: undefined,
    })
    expect(parseTitle('Elixíry (podle prováděné akce)')).toMatchObject({
      attribute: undefined,
      attributeNote: 'podle prováděné akce',
    })
    expect(parseTitle('Bez závorky')).toEqual({ name: 'Bez závorky' })
  })
})

describe('parseProfessions', () => {
  const [p] = parseProfessions(HTML, 'zakladni') as Profession[]
  it('zachytí strukturu povolání', () => {
    expect(p.id).toBe('povolani:zkusebni-hrdina')
    expect(p.intro).toBe('Úvodní *odstavec*.')
    expect(p.skills[0]).toMatchObject({
      id: 'dovednost:zkusebni-hrdina/lezeni',
      attribute: 'Tělo',
      items: ['šplhání po *zdech*'],
    })
  })
  it('oddělí flavor text a přečte rychlou volbu', () => {
    expect(p.abilities[0]).toMatchObject({
      attribute: 'Tělo',
      quickPickLevel: 3,
      flavor: '***Vylezl by i na hladkou skálu.***',
      text: 'Postava získá ***Výhodu***.',
    })
  })
  it('výstup projde validací', () => {
    const pack: ContentPack = {
      manifest: {
        format: 1,
        id: 't',
        name: 't',
        version: '1',
        source: { book: 't', edition: '1' },
      },
      professions: [p],
    }
    expect(validatePack(pack)).toEqual([])
  })
})
