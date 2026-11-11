import { describe, expect, it } from 'vitest'
// @ts-expect-error – JS modul bez typů
import { parseCharacteristic, parseCreatures, parseLimits } from './parse-bestiar.mjs'

// Vymyšlená stránka – záměrně nejde o obsah Bestiáře.
const html = `<div id="content"><h1>Zvířata</h1>
<h3><a href="#x"><span>Kocour <span class="drd2-font">ab</span></span></a></h3>
<div class="card"><p class="card__header"></p><ul>
<li><strong>Charakteristika:</strong> 1—3 (zejména <em>lov</em>)</li>
<li><strong>Sudba:</strong> 5</li>
<li><strong>Hranice:</strong> <em><strong>Tělo</strong></em> 4, <em><strong>Duše</strong></em> 2, <em><strong>Vliv</strong></em> 3</li>
</ul></div>
<p>Popis kocoura.</p>
<h4>Jak bojuje:</h4><p>» škrábe</p>
<h3>Varianta: Mluvící kocour <span class="drd2-font">ab</span></h3>
<div class="card"><p class="card__header"></p><ul><li><strong>Sudba:</strong> 6</li></ul></div>
<p>Umí mluvit.</p></div>`

describe('parse-bestiar', () => {
  it('charakteristika a hranice', () => {
    expect(parseCharacteristic('1—3 (zejména *lov*)')).toEqual({
      min: 1,
      max: 3,
      note: 'zejména *lov*',
    })
    expect(parseCharacteristic('2')).toEqual({ min: 2, max: 2 })
    expect(parseLimits('***Tělo*** 4, ***Duše*** 2, ***Vliv*** 3')).toEqual({
      Tělo: 4,
      Duše: 2,
      Vliv: 3,
    })
  })

  it('bytost, její karta, oddíly a varianta', () => {
    const [kocour, varianta] = parseCreatures(html, '03-zvirata', 'balicek')
    expect(kocour).toMatchObject({
      id: 'bytost:kocour',
      name: 'Kocour',
      kind: 'zvirata',
      glyphs: 'ab',
      fate: 5,
      limits: { Tělo: 4, Duše: 2, Vliv: 3 },
      description: 'Popis kocoura.',
    })
    expect(kocour.sections).toEqual([{ id: 'jak-bojuje', title: 'Jak bojuje:', text: '» škrábe' }])
    expect(varianta).toMatchObject({
      id: 'bytost:mluvici-kocour',
      variantOf: 'bytost:kocour',
      fate: 6,
    })
  })
})
