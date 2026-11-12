// Lokální nástroj: převede stránky Bestiáře ze SRD (reference/srd/bestiar__*.html) na obsahový balíček.
// Výstup patří do content-packs/local/ (gitignorováno – texty jsou autorské dílo).
// Použití: node tools/srd/build-bestiar.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { KINDS, parseCreatures } from './parse-bestiar.mjs'
import { parseChapter } from './parse-chapter.mjs'

// Chyby sazby ve zdrojovém HTML SRD (ověřeno proti PDF, `node tools/srd/compare-bestiar.mjs`).
const HTML_FIXES = [
  ['mavku lze vyhé svobodit', 'mavku lze vysvobodit'],
  ['Mnoz nich jsou', 'Mnohé z nich jsou'],
  [
    'naposlebůžkům, dy. Neuváženě jsem se vysmívala lidským a když',
    'naposledy. Neuváženě jsem se vysmívala lidským bůžkům, a když',
  ],
]
const read = (f) => {
  let html = readFileSync(`reference/srd/bestiar__${f}.html`, 'utf8')
  for (const [from, to] of HTML_FIXES) html = html.replaceAll(from, to)
  return html
}
const ID = 'drd2-bestiar-2'

const creatures = Object.keys(KINDS).flatMap((f) => parseCreatures(read(f), f, ID))
const ids = new Set()
for (const c of creatures) {
  if (ids.has(c.id)) {
    console.error('Duplicitní ID bytosti:', c.id)
    process.exit(1)
  }
  ids.add(c.id)
}

const pack = {
  manifest: {
    format: 1,
    id: ID,
    name: 'Dračí doupě 2 – Bestiář (SRD)',
    version: '2.0.0',
    source: { book: 'Dračí doupě 2: Bestiář (SRD, drd2srd.d20.cz)', edition: '2' },
  },
  // úvod vysvětluje zvláštní schopnosti bytostí, na které karty odkazují
  chapters: [parseChapter(read('01-uvod'), '01-uvod')],
  professions: [],
  creatureKinds: Object.values(KINDS),
  creatures,
}

mkdirSync('content-packs/local', { recursive: true })
writeFileSync(`content-packs/local/${ID}.json`, JSON.stringify(pack, null, 1))
const byKind = {}
for (const c of creatures) byKind[c.kind] = (byKind[c.kind] ?? 0) + 1
const noStats = creatures.filter((c) => !c.stats.length).map((c) => c.name)
console.log(`bytostí: ${creatures.length}`, byKind, `bez karty: ${noStats.join(', ') || '–'}`)
