// Lokální nástroj: najde herní pojmy – v SRD jsou v sazbě ***tučná kurzíva***. Vypíše je s četností
// a s prvním místem, kde se pojem vysvětluje (nadpis, který se jmenuje stejně). Výstup: reference/terminy.md
import { readFileSync, writeFileSync } from 'node:fs'

const packs = ['drd2-pravidla-2', 'drd2-bestiar-2'].map((id) =>
  JSON.parse(readFileSync(`content-packs/local/${id}.json`, 'utf8')),
)
const counts = new Map()
const note = (t) => {
  for (const m of t.matchAll(/\*\*\*([^*]+?)\*\*\*/g)) {
    const k = m[1].trim().toLowerCase()
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
}
const walkBlocks = (bs) => {
  for (const b of bs ?? []) {
    if (b.text) note(b.text)
    if (b.items)
      (function w(i) {
        i.forEach((x) => (note(x.text), x.items && w(x.items)))
      })(b.items)
    if (b.rows) b.rows.flat().forEach(note)
    if (b.blocks) walkBlocks(b.blocks)
  }
}
for (const p of packs) {
  for (const c of p.chapters ?? []) walkBlocks(c.blocks)
  for (const pr of p.professions) {
    note(pr.intro)
    for (const a of pr.abilities) (note(a.text), a.flavor && note(a.flavor))
  }
  for (const r of p.races ?? []) for (const a of r.abilities) note(a.text)
  for (const c of p.creatures ?? []) {
    note(c.description)
    c.sections.forEach((s) => note(s.text))
    c.stats.forEach((s) => note(s.value))
  }
}
const sorted = [...counts].sort((a, b) => b[1] - a[1])
const lines = [
  '# Herní pojmy v sazbě ***tučná kurzíva***',
  '',
  `Různých tvarů: ${sorted.length}`,
  '',
]
for (const [k, n] of sorted) lines.push(`- ${k} (${n}×)`)
writeFileSync('reference/terminy.md', lines.join('\n'))
console.log(
  'tvarů:',
  sorted.length,
  '| prvních 40:',
  sorted
    .slice(0, 40)
    .map(([k, n]) => `${k} ${n}`)
    .join(', '),
)
