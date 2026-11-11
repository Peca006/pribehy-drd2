// Lokální nástroj: převede stažené stránky SRD (reference/srd) na obsahový balíček.
// Výstup patří do content-packs/local/ (gitignorováno – texty jsou autorské dílo).
// Použití: node tools/srd/build.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { readdirSync } from 'node:fs'
import { parseProfessions } from './parse-povolani.mjs'
import { parseChapter } from './parse-chapter.mjs'

const dir = 'reference/srd/'
const read = (f) => readFileSync(`${dir}${f}`, 'utf8')

const professions = [
  ...parseProfessions(read('zakladni-prirucka__25-zakladni-povolani.html'), 'zakladni'),
  ...parseProfessions(read('zakladni-prirucka__26-pokrocila-povolani.html'), 'pokrocile'),
]

const chapters = readdirSync(dir)
  .filter((f) => f.startsWith('zakladni-prirucka__'))
  .sort()
  .map((f) => parseChapter(read(f), f.replace('zakladni-prirucka__', '').replace('.html', '')))

const pack = {
  manifest: {
    format: 1,
    id: 'drd2-pravidla-2',
    name: 'Dračí doupě 2 – Pravidla (SRD)',
    version: '2.0.0',
    source: { book: 'Dračí doupě 2: Pravidla (SRD, drd2srd.d20.cz)', edition: '2' },
  },
  chapters,
  professions,
}

// Opravy SRD podle tištěné knihy (drd2-pravidla.pdf); viz `npm run compare:srd`. Počet zásahů je pevně daný.
const PDF_FIXES = [
  ['Vyberte si jednu rasovou základní schopnost', 'Vyberte si jednu rasovou zvláštní schopnost', 1],
  ['*Výrobě elixírů* a *Podávání* *elixírů', '*Výrobě elixírů* a *Používání* *elixírů', 2],
]
let json = JSON.stringify(pack, null, 1)
for (const [from, to, expected] of PDF_FIXES) {
  const n = json.split(from).length - 1
  if (n !== expected) {
    console.error(`Oprava podle PDF zasáhla ${n}× místo ${expected}×: ${from}`)
    process.exit(1)
  }
  json = json.replaceAll(from, to)
}

mkdirSync('content-packs/local', { recursive: true })
writeFileSync('content-packs/local/drd2-pravidla-2.json', json)
const bad = professions.filter((p) => p.abilities.length !== 12 || !p.skills.length)
if (bad.length) {
  console.error(
    'Podezřelá povolání (očekává se 12 schopností a aspoň 1 dovednost):',
    bad.map((p) => p.name),
  )
  process.exit(1)
}
console.log(
  `kapitol: ${chapters.length}, povolání: ${professions.length}, schopností: ${professions.reduce((n, p) => n + p.abilities.length, 0)}`,
)
