// Surový inventář zvláštních schopností (ZS) a dovedností z SRD balíčků.
// Bez štítků a taxonomie, jen co je ve zdroji a odkud. Výstup: JSON + přehled na konzoli.
// Použití: node tools/kartoteky/inventar.mjs [výstup.json]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const load = (f) => JSON.parse(readFileSync(resolve(root, 'content-packs/srd', f), 'utf8'));
const pravidla = load('drd2-pravidla-2.json');
const bestiar = load('drd2-bestiar-2.json');

const items = [];
const add = (o) => items.push(o);

// 1) Povolání: ZS a dovednosti
for (const pr of pravidla.professions) {
  for (const a of pr.abilities ?? [])
    add({ type: 'zs', id: a.id, name: a.name, rulebook: 'Příručka', source: `povolání:${pr.kind}:${pr.name}`,
      attribute: a.attribute ?? null, quickPickLevel: a.quickPickLevel ?? null, flavor: a.flavor ?? null, text: a.text ?? null });
  for (const s of pr.skills ?? [])
    add({ type: 'skill', id: s.id, name: s.name, rulebook: 'Příručka', source: `povolání:${pr.kind}:${pr.name}`,
      attribute: s.attribute ?? null, items: s.items ?? [], text: null });
}
// 2) Rasy a společné rasové ZS
for (const r of pravidla.races)
  for (const a of r.abilities ?? [])
    add({ type: 'zs', id: a.id, name: a.name, rulebook: 'Příručka', source: `rasa:${r.name}`,
      attribute: a.attribute ?? null, quickPickCulture: a.quickPickCulture ?? null, flavor: a.flavor ?? null, text: a.text ?? null });
for (const a of pravidla.commonRaceAbilities ?? [])
  add({ type: 'zs', id: a.id, name: a.name, rulebook: 'Příručka', source: 'rasa:společné',
    attribute: a.attribute ?? null, flavor: a.flavor ?? null, text: a.text ?? null });

// 3) Bestiář: definice jsou h4 nadpisy v kapitole „Jak bytosti číst“ (text pod nimi do dalšího nadpisu)
const ch = bestiar.chapters.find((c) => c.id === '12-jak-bytosti-cist');
let h3 = '';
const blocks = ch.blocks;
const textOf = (b) => b.text ?? (b.items ? b.items.map((i) => i.text).join('; ') : (b.blocks ? b.blocks.map(textOf).join(' ') : ''));
for (let i = 0; i < blocks.length; i++) {
  const b = blocks[i];
  if (b.type !== 'heading') continue;
  if (b.level === 3) h3 = b.id;
  if (b.level !== 4) continue;
  const txt = [];
  for (let j = i + 1; j < blocks.length && blocks[j].type !== 'heading'; j++) txt.push(textOf(blocks[j]));
  add({ type: 'bestiar-definice', id: `bestiar:${b.id}`, name: b.text, rulebook: 'Bestiář', source: `bestiář:${h3}`, text: txt.join('\n\n') });
}

// 4) Bestiář: kolik tvorů na co odkazuje (jen odkazy; nepoužité/nepojmenované se nehlásí)
const refs = new Map();
for (const c of bestiar.creatures)
  for (const st of c.stats ?? [])
    for (const m of st.value.matchAll(/\[([^\]]+)\]\(chapter:([^)#]+)#([^)]+)\)/g)) {
      const k = `${m[2]}#${m[3]}`;
      const r = refs.get(k) ?? { label: m[1], statLabel: new Set(), creatures: 0 };
      r.statLabel.add(st.label); r.creatures++; refs.set(k, r);
    }
const odkazy = [...refs].map(([k, r]) => ({ target: k, label: r.label, statLabels: [...r.statLabel], creatures: r.creatures }));

const out = resolve(root, process.argv[2] ?? 'reference/work/kartoteky-inventar.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ items, odkazy }, null, 1));

// Přehled
const count = (f) => items.filter(f).length;
console.log('=== Počty podle typu a zdroje ===');
const by = {};
for (const it of items) { const k = `${it.type} | ${it.source.split(':').slice(0, 2).join(':')}`; by[k] = (by[k] ?? 0) + 1; }
for (const [k, v] of Object.entries(by)) console.log(String(v).padStart(4), k);
console.log('\nZS Příručka:', count((i) => i.type === 'zs'), '| dovednosti Příručka:', count((i) => i.type === 'skill'), '| definice Bestiáře (h4):', count((i) => i.type === 'bestiar-definice'));
console.log('Unikátní názvy ZS:', new Set(items.filter((i) => i.type === 'zs').map((i) => i.name)).size);
console.log('Bestiář: tvorů', bestiar.creatures.length, '| unikátních odkazů na schopnosti:', odkazy.length);
const kam = {};
for (const o of odkazy) { const c = o.target.split('#')[0]; kam[c] = (kam[c] ?? 0) + 1; }
console.log('Cíle odkazů z Bestiáře:', kam);
console.log('Výstup:', out);
