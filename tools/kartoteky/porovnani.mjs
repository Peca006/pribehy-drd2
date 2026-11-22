// Porovnání Fafrinových dials s taxonomií zdola (po kartách, podle názvu).
// Vstup: reference/work/kartoteky-fafrin.json (fafrin.mjs), kartoteky-taxonomie-nahled.json (taxonomie.mjs).
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const rd = (f) => JSON.parse(readFileSync(resolve(root, 'reference/work', f), 'utf8'));
const fa = rd('kartoteky-fafrin.json');
const mine = rd('kartoteky-taxonomie-nahled.json').zs;
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const byName = new Map(mine.map((m) => [norm(m.name), m]));

// Fafrinův effect (po sjednocení velikosti písmen) -> nejbližší mechanismus
const MAP = { zbehlost: 'skill-proficiency', nadani: 'aptitude', 'obsahova pravomoc': 'narrative-authority', 'posileni dovednosti': 'craft|spell-enhance|skill-mastery|ward-sign',
  'rozsahle zdarma': 'free-maneuver', 'obrana zdarma': 'free-maneuver', 'pristupy zdarma': 'free-maneuver', 'zisk zdroju': 'scar-effect', 'silnejsi jizvy': 'scar-effect',
  'neobvykly smysl': 'unusual-sense', 'sdileni zdroju': 'grant-resources', 'prirozena ochrana': 'natural-protection', 'prirozena zbran': 'natural-protection',
  'rozsirena obrana': 'defend-others', 'posilene leceni': 'heal|scar-effect', 'sleva leceni': 'scar-effect|heal', jiny: 'other' };

const notFound = [], rows = [];
for (const f of fa) {
  const m = byName.get(norm(f.name));
  if (!m) { notFound.push(f.name); continue; }
  rows.push({ f, m });
}
console.log(`Fafrin ${fa.length}, spárováno ${rows.length}, nespárováno: ${notFound.join('; ') || '-'}`);
const missing = mine.filter((m) => /zakladni|rasa/.test(m.cls) && !fa.some((f) => norm(f.name) === norm(m.name)));
console.log('V Příručce (základní povolání, rasy) a ne u Fafrina:', missing.map((m) => m.name).join('; ') || '-');

// attribute
const attrMap = { Tělo: 'Tělo', Duše: 'Duše', Vliv: 'Vliv' };
const attrDiff = rows.filter(({ f, m }) => attrMap[f.attribute] !== m.attribute);
console.log(`\nattribute: shodných ${rows.length - attrDiff.length}/${rows.length}`, attrDiff.map(({ f, m }) => `${f.name} (F:${f.attribute} / zdroj:${m.attribute})`).join('; '));

// effect vs mechanism
let agree = 0; const dis = [];
const cross = new Map();
for (const { f, m } of rows) {
  const e = norm(f.effect);
  const exp = (MAP[e] ?? '??').split('|');
  const ok = exp.some((x) => m.mech.includes(x));
  if (ok) agree++; else dis.push({ n: f.name, e: f.effect, mech: m.mech.join('+'), purpose: f.purpose });
  const k = `${e || '(prázdné)'} -> ${m.mech.join('+')}`; cross.set(k, (cross.get(k) ?? 0) + 1);
}
console.log(`\neffect ~ mechanism: shoda ${agree}/${rows.length}; rozdíly:`);
for (const d of dis) console.log(`  ${d.n}: F effect="${d.e}" | já ${d.mech}`);
console.log('\nFafrin effect: počet hodnot po sjednocení velikosti písmen:', new Set(fa.map((f) => norm(f.effect))).size, '(před:', new Set(fa.map((f) => f.effect)).size, ')');

// activation-cost
const costTxt = (m) => (m.cost.length ? m.cost.map((c) => c.replace(/Vlivy/, 'Vliv').replace(/Suroviny|Surovina/, 'Suroviny')).join(', ') : 'Bez Aktivace');
const cd = rows.filter(({ f, m }) => {
  const a = f['activation-cost'].replace(/Bez aktivace, /i, '').replace(/Bez Aktivace, /, '');
  return norm(a) !== norm(costTxt(m)) && !(f['activation-cost'] === 'Bez Aktivace' && !m.cost.length);
});
console.log(`\nactivation-cost: odlišné ${cd.length}/${rows.length}:`);
for (const { f, m } of cd) console.log(`  ${f.name}: F="${f['activation-cost']}" | zdroj="${m.cost.join(' | ') || '-'}"`);

// related-skill
const rs = rows.filter(({ f }) => f['related-skill']);
let rsOk = 0; const rsBad = [];
for (const { f, m } of rs) {
  const mine = m.skills.map((s) => s.split('/')[1]);
  const fv = norm(f['related-skill'].replace(/­/g, '')).split(',').map((x) => x.trim());
  const hit = mine.some((s) => fv.some((v) => norm(s.replace(/-/g, ' ')).slice(0, 5) === v.slice(0, 5)));
  if (hit) rsOk++; else rsBad.push(`${f.name}: F="${f['related-skill']}" | já=[${mine.join(', ')}]`);
}
console.log(`\nrelated-skill: Fafrin vyplnil ${rs.length}, shodné s textem ${rsOk}. Neshoda:`); rsBad.forEach((x) => console.log('  ' + x));
const mineOnly = rows.filter(({ f, m }) => !f['related-skill'] && m.skills.length);
console.log(`Já našel související dovednost, Fafrin nevyplnil: ${mineOnly.length} (např. ${mineOnly.slice(0, 8).map(({ f }) => f.name).join(', ')})`);

// level vs quick-pick
const lv = rows.filter(({ f, m }) => (f.level === 'základní') !== (m.cls.includes('zakladni')));
console.log(`\nlevel: Fafrin „základní“ ${rows.filter(({ f }) => f.level === 'základní').length}, základní povolání u mě ${rows.filter(({ m }) => m.cls.includes('zakladni')).length}; rozdíl u ${lv.length}`);

// purpose: ruční přehled hodnot vs mé target-kind
console.log('\npurpose (Fafrin) obsahuje druh bytosti:', rows.filter(({ f }) => /Lidé|Zvířata|Nemrtví|Běsi|Netvoři|Oživení/.test(f.purpose)).length, '| já target-kind uvedeno:', rows.filter(({ m }) => m.kinds.length).length);
