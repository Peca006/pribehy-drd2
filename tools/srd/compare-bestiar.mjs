// Lokální nástroj: porovná bytosti Bestiáře (balíček) s textem PDF Bestiáře.
// Použití: node tools/srd/compare-bestiar.mjs [balicek.json] [pdf.txt] [vystup.md]
// PDF text: pdftotext -enc UTF-8 reference/drd2-bestiar.pdf reference/text/bestiar.txt
// Výstup obsahuje citace z autorského díla, proto patří jen do reference/ (gitignorováno).
import { readFileSync, writeFileSync } from 'node:fs'
import { compare } from './compare-lib.mjs'

const [
  packFile = 'content-packs/local/drd2-bestiar-2.json',
  pdfFile = 'reference/text/bestiar.txt',
  out = 'reference/rozdily-bestiar-pdf.md',
] = process.argv.slice(2)

const pack = JSON.parse(readFileSync(packFile, 'utf8'))
const p = (text) => ({ type: 'p', text })
const split = (t) => String(t).split(/\n+/).filter(Boolean).map(p)
// jedna „kapitola“ na bytost, aby bylo v hlášení vidět, o kterou jde
const chapters = (pack.creatures ?? []).map((c) => ({
  id: c.name,
  blocks: [
    p(c.name),
    ...c.stats.map((s) => p(`${s.label} ${s.value}`)),
    ...split(c.description),
    ...c.sections.flatMap((s) => [p(s.title), ...split(s.text)]),
  ],
}))
const result = compare({ chapters }, readFileSync(pdfFile, 'utf8'))

const lines = [
  '# Porovnání Bestiáře SRD (balíček) s PDF',
  '',
  `Odstavců: ${result.total}, s rozdílem: ${result.diffs.length}`,
  '',
]
for (const [name, list] of Object.entries(result.byChapter)) {
  lines.push(`## ${name} (${list.length})`, '')
  for (const d of list) {
    lines.push(`- **${d.kind}**: ${d.text.slice(0, 80)}…`)
    lines.push(`  - SRD: ${d.srd}`, `  - PDF: ${d.pdf ?? '(nenalezeno)'}`)
  }
  lines.push('')
}
writeFileSync(out, lines.join('\n'))
const summary = {}
for (const d of result.diffs) summary[d.kind] = (summary[d.kind] ?? 0) + 1
console.log('odstavců:', result.total, '| s rozdílem:', result.diffs.length, summary)
console.log('bytostí s rozdílem:', Object.keys(result.byChapter).length, '| zapsáno:', out)
