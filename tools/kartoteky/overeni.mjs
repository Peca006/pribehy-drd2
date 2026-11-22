// Kontrola exportu proti Fafrinově sadě (86 karet): shoda dial po dialu. Vyžaduje fafrin.mjs a export.mjs.
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const rd = (f) => JSON.parse(readFileSync(resolve(root, 'reference/work', f), 'utf8'));
const fa = rd('kartoteky-fafrin.json');
const mine = new Map(rd('kartoteky-karty.json').filter((c) => c.type === 'zs').map((c) => [c.name.toLowerCase(), c]));
const parse = (md) => new Map([...md.matchAll(/<drd2-zs\s*\n([\s\S]*?)\n>/g)].map((m) => {
  const d = {}; for (const l of m[1].matchAll(/^([\w-]+)="(.*)"$/gm)) d[l[1]] = l[2]; return [d.name.toLowerCase(), d];
}));
const ex = parse(readFileSync(resolve(root, 'reference/work/kartoteky-export/drd2-zs.md'), 'utf8'));
const set = (s) => new Set((s ?? '').toLowerCase().replace(/­/g, '').split(',').map((x) => x.trim()).filter(Boolean));
const eq = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
const stat = {};
const bad = {};
for (const f of fa) {
  const e = ex.get(f.name.toLowerCase());
  if (!e) { (bad.chybí ??= []).push(f.name); continue; }
  const chk = (k, ok, info) => { stat[k] = (stat[k] ?? 0) + (ok ? 1 : 0); if (!ok) (bad[k] ??= []).push(`${f.name}: F="${info[0]}" | já="${info[1]}"`); };
  for (const k of ['attribute', 'level', 'class-basic', 'race', 'rulebook']) chk(k, (f[k] ?? '') === (e[k] ?? ''), [f[k], e[k]]);
  chk('related-skill', eq(set(f['related-skill']), set(e['related-skill'])), [f['related-skill'], e['related-skill']]);
  const fc = f['activation-cost'];
  chk('activation-cost', fc.toLowerCase() === e['activation-cost'].replace(/; /g, ', ').toLowerCase(), [f['activation-cost'], e['activation-cost']]);
  const fp = set(f.purpose), ep = set(e.purpose);
  chk('purpose (shodná množina)', eq(fp, ep), [f.purpose, e.purpose]);
  chk('purpose (já ⊆ Fafrin)', [...ep].every((x) => fp.has(x)), [f.purpose, e.purpose]);
  chk('purpose (Fafrin ⊆ já)', [...fp].every((x) => ep.has(x)), [f.purpose, e.purpose]);
}
console.log(`Karet ${fa.length}`); for (const [k, v] of Object.entries(stat)) console.log(String(v).padStart(3), '/ 86', k);
if (process.argv[2]) for (const k of process.argv[2].split(',')) { console.log(`\n== ${k}`); (bad[k] ?? []).forEach((x) => console.log('  ' + x)); }
