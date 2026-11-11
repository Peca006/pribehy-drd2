import { describe, expect, it } from 'vitest'
// @ts-expect-error – JS modul bez typů
import { compare, cleanPdfText, KINDS } from './compare-lib.mjs'

// Vymyšlený text – záměrně nejde o obsah pravidel.
const para = (text: string) => ({ type: 'p', text })
const pack = (...texts: string[]) => ({
  chapters: [{ id: 'k1', title: 'K', blocks: texts.map(para) }],
})

const A = 'Zkušený trpaslík odnesl sto dvacet pět truhlic přes horský průsmyk a přitom nezakopl.'
const B =
  'Statečná hraničářka přeplula chladnou řeku, zatímco její společníci hlídali tábor u ohně.'

describe('compare', () => {
  it('shodný text (i s dělením slov a záhlavím stran) nehlásí rozdíl', () => {
    const pdf = `Část II. – Zkouška\n${A.replace('trpaslík', 'trp aslík')}\n-3-\n\f${B}`
    expect(compare(pack(A, B), pdf).diffs).toEqual([])
  })

  it('pozná změněné slovo v zápisu čísla', () => {
    const r = compare(pack(A), A.replace('dvacet pět', 'dvacet šest') + '\n' + B)
    expect(r.diffs).toHaveLength(1)
    expect(r.diffs[0].kind).toBe(KINDS.wording)
  })

  it('pozná změněnou číslici', () => {
    const src = 'Postava získá 3 Zdroje za každou úspěšnou akci provedenou v tomto kole boje.'
    const r = compare(pack(src), src.replace('3 Zdroje', '2 Zdroje'))
    expect(r.diffs.map((d: { kind: string }) => d.kind)).toEqual([KINDS.number])
  })

  it('pozná překlep a jiné slovo', () => {
    const typo = compare(pack(A), A.replace('truhlic', 'trublic'))
    expect(typo.diffs.map((d: { kind: string }) => d.kind)).toEqual([KINDS.typo])
    const word = compare(pack(A), A.replace('truhlic', 'barelů'))
    expect(word.diffs.map((d: { kind: string }) => d.kind)).toEqual([KINDS.wording])
  })

  it('hlásí úsek PDF, který v SRD chybí', () => {
    const extra =
      'Tuto celou větu navíc najdeme jen v tištěné knize a nikde jinde v elektronickém textu.'
    const r = compare(pack(A), `${A}\n${extra}`)
    expect(r.pdfOnly).toHaveLength(1)
    expect(r.pdfOnly[0]).toContain('tutocelouvětu')
  })
})

describe('cleanPdfText', () => {
  it('odstraní záhlaví a čísla stran', () => {
    expect(cleanPdfText('Část III. – Hraní hry\ntext\n-12-\n')).not.toMatch(/Část|-12-/)
  })
})
