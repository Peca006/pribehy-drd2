// Načte Fafrinovu sadu (reference/kartoteky/drd2-zs.md) do polí a vypíše rozložení hodnot jednotlivých dials.
// Použití: node tools/kartoteky/fafrin.mjs [cesta k drd2-zs.md]
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const cands = [process.argv[2], resolve(root, 'reference/kartoteky/drd2-zs.md'), resolve(root, '../pribehy-drd2/reference/kartoteky/drd2-zs.md')].filter(Boolean);
const file = cands.find((c) => existsSync(c));
if (!file) throw new Error('drd2-zs.md nenalezen');
const txt = readFileSync(file, 'utf8');

// Dělí se podle otevíracího tagu: u karty „Zaříkávač koní“ ve zdroji chybí uzavírací </drd2-zs>.
export const cards = txt.replace(/\r/g, '').split(/<drd2-zs\s*\n/).slice(1).map((chunk) => {
  const m = chunk.match(/^([\s\S]*?)\n>\s*\n([\s\S]*)$/);
  const dials = {};
  for (const l of m[1].matchAll(/^([\w-]+)="(.*)"$/gm)) dials[l[1]] = l[2];
  return { ...dials, body: m[2].replace(/<\/drd2-zs>\s*$/, '').trim() };
});

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log('Karet:', cards.length, '| soubor:', file);
  const multi = new Set(['effect', 'purpose', 'related-skill', 'race', 'class-basic', 'class-advanced', 'class-expert', 'monster']);
  for (const k of Object.keys(cards[0]).filter((k) => k !== 'body' && k !== 'name')) {
    const c = new Map();
    for (const x of cards) {
      const vals = multi.has(k) ? (x[k] || '').split(',').map((s) => s.trim()) : [x[k] || ''];
      for (const v of vals) c.set(v || '(prázdné)', (c.get(v || '(prázdné)') ?? 0) + 1);
    }
    console.log(`\n== ${k} (${c.size} hodnot)`);
    console.log([...c].sort((a, b) => b[1] - a[1]).map(([v, n]) => `${n}× ${v}`).join(' | '));
  }
  writeFileSync(resolve(root, 'reference/work/kartoteky-fafrin.json'), JSON.stringify(cards, null, 1));
}
