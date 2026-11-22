// Návrh dials dovedností: type, environment, target, target-attribute, source-zs. Pravidlové odvození, výstup k posouzení.
// Použití: node tools/kartoteky/dovednosti.mjs   (po inventar.mjs a taxonomie.mjs)
// Výstup: tools/kartoteky/DOVEDNOSTI-NAVRH.md (tabulka 77 dovedností) a reference/work/kartoteky-dovednosti-dials.json
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const prev = JSON.parse(readFileSync(resolve(root, 'reference/work/kartoteky-taxonomie-nahled.json'), 'utf8'));
const strip = (s) => (s ?? '').replace(/\*/g, '').replace(/\s+/g, ' ').trim();
const fold = (s) => strip(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// type: stejný slovník jako `domain` u ZS; Kostka zná Boj, Magie, Výroba, Léčení („lze přidat další“)
const TYPE_CS = { combat: 'Boj', magic: 'Magie', craft: 'Výroba', healing: 'Léčení', knowledge: 'Znalosti', social: 'Jednání', movement: 'Pohyb', stealth: 'Skrývání' };
const AREA_TO_TYPE = { 'combat-melee': 'combat', 'combat-ranged': 'combat', 'combat-vs-kind': 'combat', 'magic-school': 'magic', 'craft-production': 'craft', 'craft-use': 'craft',
  healing: 'healing', knowledge: 'knowledge', 'social-direct': 'social', 'social-network': 'social', leadership: 'social', 'movement-survival': 'movement', secrecy: 'stealth' };
const TYPE_OVERRIDE = { sila: [], 'odolnost-a-vydrz': [], vule: [], 'triky-a-kejkle': ['stealth'], 'orientace-v-divocine': ['movement', 'knowledge'], 'orientace-ve-meste': ['movement', 'knowledge'],
  tabornictvi: ['craft', 'knowledge'], 'masti-a-bezne-jedy': ['craft', 'healing'], 'umely-zivot': ['magic'], 'prevleky-a-predstirani': ['social', 'stealth'], 'osetrovani-lidskeho-tela': ['healing'],
  'osetrovani-lidske-duse': ['healing'], 'leceni-zvirat': ['healing'], 'obnovovani-lidskeho-vlivu': ['healing'], nektary: ['healing', 'craft'], 'vyroba-omamnych-latek-a-odvaru': ['craft', 'healing'],
  'pusobeni-v-podsveti': ['social'], 'utajovani-informaci': ['stealth', 'knowledge'] };

const KINDS = [['animals', /zvir/], ['monsters', /netvor/], ['people', /\blid(i|em|mi|sk\w*)\b|lidu|clovek/], ['constructs', /ozivene|umely zivot/], ['undead', /nemrtv|nezivych|nezivi/], ['fiends', /\bbes(i|y|u|um)\b/]];
const KIND_CS = { people: 'Lidé', animals: 'Zvířata', monsters: 'Netvoři', undead: 'Nemrtví a neživí', constructs: 'Oživení', fiends: 'Běsi' };
const TARGET_ATTR = { 'osetrovani-lidskeho-tela': 'Tělo', 'leceni-zvirat': 'Tělo', 'osetrovani-lidske-duse': 'Duše', 'obnovovani-lidskeho-vlivu': 'Vliv', nektary: 'Vliv' };

const rows = prev.skills.map((s) => {
  const key = s.id.split('/')[1];
  const name = fold(s.name), first = fold(s.items[0] ?? ''), all = fold(s.items.join(' '));
  const type = TYPE_OVERRIDE[key] ?? [...new Set(s.area.map((a) => AREA_TO_TYPE[a]).filter(Boolean))];
  // prostředí: jen z názvu („v divočině“, „ve městě“) a dvě výslovné výjimky (pohyb a táboření v divočině)
  const env = [/divocin/.test(name) || ['cestovani', 'tabornictvi'].includes(key) ? 'Divočina' : null, /\bve meste\b/.test(name) ? 'Město' : null].filter(Boolean);
  // cíl: z názvu; výjimky podle toho, na koho se dovednost opravdu zaměřuje (obecné „proti běžným protivníkům“ cíl není)
  const MANUAL_TARGET = { 'lovecke-znalosti': ['animals'], 'hraniarske-znalosti': ['monsters'], 'hranicarske-znalosti': ['monsters'], 'vedmacke-znalosti': ['undead'], znameni: ['undead'], 'vyjednavani-s-nadprirozenem': ['monsters', 'undead', 'fiends'],
    'magie-mysli': ['people'], zarikani: ['people', 'animals'], 'osetrovani-lidske-duse': ['people'], 'vyroba-omamnych-latek-a-odvaru': ['people', 'animals'], 'podavani-omamnych-latek': ['people', 'animals'] };
  const kindsName = KINDS.filter(([, re]) => re.test(name)).map(([k]) => k);
  const target = MANUAL_TARGET[key] ?? kindsName;
  const certain = !MANUAL_TARGET[key];
  return { id: s.id.replace('dovednost:', ''), name: s.name, attribute: s.attribute, origin: s.source, type, env, target, targetCertain: certain, targetAttr: TARGET_ATTR[key] ?? null,
    kindsAll: KINDS.filter(([, re]) => re.test(all)).map(([k]) => k) };
});

const cs = (a, m) => a.map((x) => m[x]).join(', ');
const md = ['# Dovednosti – návrh dials (type, environment, target, target-attribute, source-zs)', '',
  'Pravidlové odvození (`dovednosti.mjs`), k posouzení. `target` z názvu je jistý, z prvního bodu popisu označen „?“. `source-zs` je u všech prázdné: dovednosti',
  'Příručky patří povolání, žádná není podmíněna konkrétní ZS. `target-attribute` jen u dovedností, které léčí či obnovují konkrétní vlastnost.', '',
  '| dovednost | povolání | type | environment | target | target-attribute |', '|---|---|---|---|---|---|',
  ...rows.map((r) => `| ${r.name} | ${r.origin.split(':').slice(1).join(' / ')} | ${cs(r.type, TYPE_CS) || '–'} | ${r.env.join(', ') || '–'} | ${r.target.length ? cs(r.target, KIND_CS) + (r.targetCertain ? '' : ' ?') : '–'} | ${r.targetAttr ?? '–'} |`)];
writeFileSync(resolve(root, 'tools/kartoteky/DOVEDNOSTI-NAVRH.md'), md.join('\n') + '\n');
writeFileSync(resolve(root, 'reference/work/kartoteky-dovednosti-dials.json'), JSON.stringify(rows, null, 1));

const cnt = (f) => { const m = new Map(); for (const r of rows) for (const k of f(r)) m.set(k, (m.get(k) ?? 0) + 1); return [...m].map(([k, v]) => `${v}× ${k}`).join(' | '); };
console.log('type:', cnt((r) => (r.type.length ? r.type.map((t) => TYPE_CS[t]) : ['(bez)'])));
console.log('environment:', cnt((r) => (r.env.length ? r.env : ['(bez)'])));
console.log('target:', cnt((r) => (r.target.length ? r.target.map((t) => KIND_CS[t] + (r.targetCertain ? '' : '?')) : ['(bez)'])));
console.log('target-attribute:', cnt((r) => [r.targetAttr ?? '(bez)']));
console.log('\nDovednosti, kde jiné druhy cíle zmiňuje jen popis (ne název ani první bod):');
for (const r of rows.filter((r) => r.kindsAll.some((k) => !r.target.includes(k)))) console.log(' ', r.name, '→', r.kindsAll.filter((k) => !r.target.includes(k)).map((k) => KIND_CS[k]).join(', '));
