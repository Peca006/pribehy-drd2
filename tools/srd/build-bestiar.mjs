// Lokální nástroj: převede stránky Bestiáře ze SRD (reference/srd/bestiar__*.html) na obsahový balíček.
// Výstup patří do content-packs/local/ (gitignorováno – texty jsou autorské dílo).
// Použití: node tools/srd/build-bestiar.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { BESTIAR_PAGES, buildBestiarPack } from './pipeline.mjs'

const pages = Object.fromEntries(
  BESTIAR_PAGES.map((f) => [f, readFileSync(`reference/srd/bestiar__${f}.html`, 'utf8')]),
)
const { json, problems, pack, id } = buildBestiarPack(pages)
if (problems.length) {
  console.error(problems.join(', '))
  process.exit(1)
}

mkdirSync('content-packs/local', { recursive: true })
writeFileSync(`content-packs/local/${id}.json`, json)
const byKind = {}
for (const c of pack.creatures) byKind[c.kind] = (byKind[c.kind] ?? 0) + 1
const noStats = pack.creatures.filter((c) => !c.stats.length).map((c) => c.name)
console.log(`bytostí: ${pack.creatures.length}`, byKind, `bez karty: ${noStats.join(', ') || '–'}`)
