// Lokální nástroj: porovná text kapitol SRD (obsahový balíček) s textem PDF knihy.
// Použití: node tools/srd/compare-pdf.mjs [balicek.json] [pdf.txt] [vystup.md]
// PDF text: pdftotext -enc UTF-8 reference/drd2-pravidla.pdf reference/text/pravidla.txt
// Výstup obsahuje citace z autorského díla, proto patří jen do reference/ (gitignorováno).
import { readFileSync, writeFileSync } from 'node:fs'
import { compare } from './compare-lib.mjs'

const [
  packFile = 'content-packs/local/drd2-pravidla-2.json',
  pdfFile = 'reference/text/pravidla.txt',
  out = 'reference/rozdily-srd-pdf.md',
] = process.argv.slice(2)

const pack = JSON.parse(readFileSync(packFile, 'utf8'))
const pdfText = readFileSync(pdfFile, 'utf8')
const result = compare(pack, pdfText)

const lines = [
  '# Porovnání SRD (balíček) s PDF',
  '',
  `Odstavců SRD: ${result.total}, s rozdílem: ${result.diffs.length}`,
  '',
]
for (const [chapter, list] of Object.entries(result.byChapter)) {
  lines.push(`## ${chapter} (${list.length})`, '')
  for (const d of list) {
    lines.push(`- **${d.kind}**: ${d.text.slice(0, 80)}…`)
    lines.push(`  - SRD: ${d.srd}`, `  - PDF: ${d.pdf ?? '(nenalezeno)'}`)
  }
  lines.push('')
}
lines.push('## Úseky v PDF, které v SRD nejsou', '')
for (const r of result.pdfOnly) lines.push(`- ${r}`)
writeFileSync(out, lines.join('\n'))

const summary = {}
for (const d of result.diffs) summary[d.kind] = (summary[d.kind] ?? 0) + 1
console.log(
  'odstavců SRD:',
  result.total,
  '| s rozdílem:',
  result.diffs.length,
  summary,
  '| úseků jen v PDF:',
  result.pdfOnly.length,
)
console.log('zapsáno:', out)
