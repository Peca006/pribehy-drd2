// Ze surového inventáře a pravidlového štítkování vyrobí ploché karty (JSON) a export ve formátu Kostky.
// Pořadí: inventar.mjs -> taxonomie.mjs -> export.mjs. Štítky jsou automatické (pole `labels`), ne ruční revize.
// Výstup (lokální, v ignorovaném reference/work/): kartoteky-karty.json, kartoteky-export/drd2-zs.md, drd2-skill.md.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MECHANISM, SINGLETONS, DOMAIN, SUBJECT, TARGET_KIND, ATTRIBUTE, RESOURCE, RACE } from './slovnik.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const rd = (f) => JSON.parse(readFileSync(resolve(root, 'reference/work', f), 'utf8'));
const inv = rd('kartoteky-inventar.json');
const prev = rd('kartoteky-taxonomie-nahled.json');
const strip = (s) => (s ?? '').replace(/\*/g, '').replace(/\s+/g, ' ').trim();
const fold = (s) => strip(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const slug = (s) => fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const attrId = (cs) => Object.entries(ATTRIBUTE).find(([, v]) => v === cs)?.[0] ?? null;

const skillName = new Map(inv.items.filter((i) => i.type === 'skill').map((s) => [s.id.replace('dovednost:', ''), s.name]));

// Markdown ve stylu Kostky: ***x*** -> **_x_**, *x* -> _x_
const md = (s) => (s ?? '').replace(/\*\*\*([^*]+)\*\*\*/g, '**_$1_**').replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '_$1_').trim();
const flavorMd = (s) => (s ? `_**${strip(s)}**_` : '');

// ---- pomocné odvozování ----
const originOf = (src) => {
  const [k, a, b] = src.split(':');
  if (k === 'povolání') return { kind: a === 'zakladni' ? 'class-basic' : 'class-advanced', name: b };
  if (k === 'rasa') return { kind: 'race', name: a };
  return { kind: 'bestiary', name: a };
};
const costOf = (text) => [...fold(text).matchAll(/\(aktivace (\d+) (dus\w*|tel\w*|vliv\w*|surovin\w*)([^)]*)\)/g)].map((m) => {
  const w = m[2];
  const resource = w.startsWith('dus') ? 'soul' : w.startsWith('tel') ? 'body' : w.startsWith('vliv') ? 'influence' : 'material';
  const note = m[3].trim();
  return { resource, amount: +m[1], ...(note ? { note } : {}) };
});
const kindsOf = (t) => Object.entries({
  people: /\b(lid|clovek|lidem|lidi|lidsk)\w*/, animals: /zvir\w+/, monsters: /netvor\w*/, undead: /nemrtv\w*/,
  fiends: /\bbes(i|y|u|um|ech)?\b/, constructs: /oziven\w*/, inanimate: /\bnezi\w*/,
}).filter(([, re]) => re.test(t)).map(([k]) => k);
const subjectOf = (t) => Object.entries({
  wards: /obraz[ce]c/, poisons: /\bjed(y|u|em|ech|um|ove|ovy\w*)?\b|protijed/, traps: /\bpast\w*/, salves: /\bmast\w*/, trophies: /trofej\w*/, springs: /zridl\w*/, 'ritual-items': /ritualn\w+ predmet/,
}).filter(([, re]) => re.test(t)).map(([k]) => k);
const AREA_TO_DOMAIN = { 'combat-melee': 'combat', 'combat-ranged': 'combat', 'combat-vs-kind': 'combat', 'social-direct': 'social', 'social-network': 'social',
  leadership: 'social', knowledge: 'knowledge', 'magic-school': 'magic', 'craft-production': 'craft', 'craft-use': 'craft', healing: 'healing', 'movement-survival': 'movement', secrecy: 'stealth' };
const skillArea = new Map(prev.skills.map((s) => [s.id.replace('dovednost:', ''), s.area]));
const domainOf = (z, t) => {
  const d = new Set();
  for (const sid of z.skills) for (const a of skillArea.get(sid) ?? []) if (AREA_TO_DOMAIN[a]) d.add(AREA_TO_DOMAIN[a]);
  if (z.mech.includes('stealth-evasion') || /ukryt|skryt|plizit|setrast/.test(t)) d.add('stealth');
  if (z.mech.some((m) => ['spell-enhance', 'ward-sign'].includes(m))) d.add('magic');
  if (z.mech.includes('craft')) d.add('craft');
  if (z.mech.includes('heal')) d.add('healing');
  if (z.mech.includes('companion')) d.add('companions');
  if (z.mech.includes('assess-abilities')) d.add('assessment');
  if (!d.size) {
    if (/\b(boj|zbran|zbroj|utok|strel|vrh|telesn)\w*/.test(t)) d.add('combat');
    if (/zastrasov|presvedc|ovlivn|jednani|vyjedn|akc\w+ spadajici pod vliv|duvera|fam/.test(t)) d.add('social');
  }
  return [...d];
};
const BESTIARY_FORCED = { 'Vůdce skupiny': 'group-rule', 'Člen skupiny': 'group-rule', 'Boj či ovlivňování ve skupině': 'group-rule', Dav: 'group-rule', 'Živá vlna': 'group-rule',
  'Triumfální příchod': 'group-rule', Nezranitelnost: 'against-being', Zranitelnost: 'against-being', Neschopnost: 'against-being', Nezastavitelný: 'against-being', Nesmrtelný: 'against-being' };
const BESTIARY27 = 'Játra z křemene|Ocelová vůle|Srdce gryfa|Nos na lumpárny|Ve zbroji jako v kůži|Oživlá hora|Třetí oko|Autorita|Hrůza a děs|Diplomat|Bulíky na nos|Rozsévač|Triumfální příchod|Boj či ovlivňování ve skupině|Vůdce skupiny|Člen skupiny|Živá vlna|Nelidská rychlost|Ztělesněná zkáza|Masakr|Nezastavitelný|Prastarý|Dav|Nesmrtelný|Nezranitelnost|Zranitelnost|Neschopnost'.split('|');

const normMech = (m) => [...new Set(m.map((x) => (SINGLETONS.includes(x) ? 'special-effect' : x === 'other' ? 'special-effect' : x)))];

// ---- karty ZS Příručky ----
const cards = [];
for (const z of prev.zs) {
  const t = fold(z.text);
  const o = originOf(z.source);
  cards.push({
    type: 'zs', id: slug(z.name), name: z.name, source: 'srd', rulebook: 'Příručka', origin: o,
    attribute: attrId(z.attribute), mechanism: normMech(z.mech), domain: domainOf(z, t), subject: subjectOf(t), targetKind: kindsOf(t),
    mass: z.area === 'area' || undefined, activationCost: costOf(z.text),
    relatedSkill: z.skills.map((id) => ({ id, name: skillName.get(id) })),
    quickPick: z.quickPickLevel ?? z.quickPickCulture ?? undefined, monster: false, flavor: z.flavor ?? undefined, text: z.text, labels: 'auto',
  });
}
// ---- bestiářové schopnosti (27) ----
for (const b of inv.items.filter((i) => i.type === 'bestiar-definice')) {
  const name = b.name.replace(/ \(.*\)$/, '');
  if (!BESTIARY27.includes(name)) continue;
  const attr = b.name.match(/\((Tělo|Duše|Vliv)\)/)?.[1];
  const t = fold(b.text);
  const mech = BESTIARY_FORCED[name] ? [BESTIARY_FORCED[name]] : null;
  cards.push({
    type: 'zs', id: slug(name), name, source: 'srd', rulebook: 'Bestiář', origin: { kind: 'bestiary', name: 'Bestiář' }, attribute: attrId(attr) ?? null,
    mechanism: mech ?? [], domain: [], subject: [], targetKind: kindsOf(t), activationCost: [], relatedSkill: [], monster: true, text: b.text, labels: 'auto-draft',
  });
}
// ---- dovednosti ----
const areaType = { 'combat-melee': 'Boj', 'combat-ranged': 'Boj', 'combat-vs-kind': 'Boj', 'magic-school': 'Magie', 'craft-production': 'Výroba', 'craft-use': 'Výroba', healing: 'Léčení' };
for (const s of prev.skills) {
  const o = originOf(s.source);
  cards.push({
    type: 'skill', id: slug(s.name), name: s.name, source: 'srd', rulebook: 'Příručka', origin: o, attribute: attrId(s.attribute),
    area: s.area, text: s.items.map((i) => `- ${md(i)}`).join('\n'), labels: 'auto',
  });
}
// unikátnost názvu a id
const dup = (k) => { const m = new Map(); for (const c of cards) m.set(c[k], (m.get(c[k]) ?? 0) + 1); return [...m].filter(([, n]) => n > 1).map(([v]) => v); };
if (dup('name').length || dup('id').length) console.error('KOLIZE názvů:', dup('name'), 'id:', dup('id'));

// ---- export ve formátu Kostky ----
const kostka = (map, ids) => [...new Set(ids.flatMap((i) => map[i]?.kostka?.[0] ?? []))];
const costText = (c) => (c.length ? [...new Set(c.map((x) => `${RESOURCE[x.resource]}: ${x.amount}`))].join(', ') : 'Bez Aktivace');
const dial = (k, v) => `${k}="${v ?? ''}"`;
const zsMd = cards.filter((c) => c.type === 'zs').map((c) => {
  const eff = kostka(MECHANISM, c.mechanism).join(', ');
  const purpose = [...kostka(DOMAIN, c.domain), ...kostka(SUBJECT, c.subject), ...kostka(TARGET_KIND, c.targetKind)].join(', ');
  const cb = c.origin.kind === 'class-basic' ? c.origin.name : '';
  const ca = c.origin.kind === 'class-advanced' ? c.origin.name : '';
  return ['<drd2-zs', dial('name', c.name), dial('rulebook', c.rulebook === 'Příručka' ? 'Základní příručka' : c.rulebook),
    dial('level', c.origin.kind === 'class-basic' ? 'základní' : c.origin.kind === 'class-advanced' ? 'pokročilá' : ''),
    dial('attribute', ATTRIBUTE[c.attribute] ?? ''), dial('related-skill', c.relatedSkill.map((r) => r.name).join(', ')), dial('effect', eff), dial('purpose', purpose),
    dial('activation-cost', costText(c.activationCost)), dial('class-basic', cb), dial('class-advanced', ca), dial('class-expert', ''),
    dial('race', c.origin.kind === 'race' ? (RACE[c.origin.name.replace(/^rasa:/, '')] ?? '') : ''), dial('monster', c.monster ? 'ano' : ''), '>', '',
    c.flavor ? flavorMd(c.flavor) + '\n' : '', md(c.text), '', '</drd2-zs>', ''].join('\n');
}).join('\n');
const skillMd = cards.filter((c) => c.type === 'skill').map((c) => {
  const type = [...new Set(c.area.map((a) => areaType[a]).filter(Boolean))].join(', ');
  return ['<drd2-skill', dial('name', c.name), dial('rulebook', 'Základní příručka'), dial('attribute', ATTRIBUTE[c.attribute] ?? ''),
    dial('level', c.origin.kind === 'class-basic' ? 'základní' : 'pokročilá'), dial('source-zs', ''), dial('environment', ''), dial('target', ''), dial('target-attribute', ''),
    dial('type', type), dial('class-basic', c.origin.kind === 'class-basic' ? c.origin.name : ''), dial('class-advanced', c.origin.kind === 'class-advanced' ? c.origin.name : ''),
    dial('class-expert', ''), '>', '', c.text, '', '</drd2-skill>', ''].join('\n');
}).join('\n');

const outDir = resolve(root, 'reference/work/kartoteky-export');
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(root, 'reference/work/kartoteky-karty.json'), JSON.stringify(cards, null, 1));
writeFileSync(resolve(outDir, 'drd2-zs.md'), zsMd);
writeFileSync(resolve(outDir, 'drd2-skill.md'), skillMd);
const n = (t, r) => cards.filter((c) => c.type === t && (!r || c.rulebook === r)).length;
console.log(`Karet: ZS Příručka ${n('zs', 'Příručka')}, ZS Bestiář ${n('zs', 'Bestiář')}, dovednosti ${n('skill')}; výstup ${outDir}`);
