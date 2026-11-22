// Návrh taxonomie zdola: pravidlové (regex) štítkování ZS a dovedností nad surovým inventářem.
// Cíl: ověřit, že navržené atributy a hodnoty jdou odvodit z textu, a ukázat počty a nepokryté zbytky.
// Nezávislé na Fafrinových dials. Použití: node tools/kartoteky/taxonomie.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const inv = JSON.parse(readFileSync(resolve(root, 'reference/work/kartoteky-inventar.json'), 'utf8'));
const strip = (s) => (s ?? '').replace(/\*/g, '').replace(/\s+/g, ' ').trim();
const fold = (s) => strip(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// ---- ZS: mechanismus (co schopnost dělá) ----
const MECH = [
  ['skill-proficiency', /zbehl/],
  ['skill-mastery', /bravurn\w* ovlada|bravurni oziven/],
  ['aptitude', /nadani/],
  ['free-maneuver', /manevr\w* rozsahle[^.]*zdarma|zdarma[^.]*manevr\w* rozsahle|zdarma pouzit manevr\w* rozsahle/],
  ['free-defense', /manevr\w* obrana[^.]*zdarma|zdarma[^.]*manevr\w* obrana|zdarma pouzit manevr\w* obrana|obrana zdarma/],
  ['free-approach', /zdarma pristup|pristup\w* zdarma/],
  ['gain-resources', /nouzov\w* surovin/],
  ['defend-others', /reagovat (pomoci )?akci z obrany|reagovat pomoci akce z obrany|reagovat akci z obrany|muze[^.]*reagovat pomoci[^.]*obrany/],
  ['grant-resources', /poskytnout/],
  ['natural-protection', /prirozen\w* (ochranu|zbroj)|slevu \d na (vycerpani)|sleva \d na vycerpani|slevu 1 na vycerpani|poskytuji zbroje o 1 mensi slevu/],
  // účinek na hospodaření s Jizvami (Zdroj navíc při zasazení, nižší náročnost, levnější léčení); samotná zmínka o Jizvě to není
  ['scar-effect', /zasadi-li si|narocnost zpusobena jizv|uzdravovani sv\w* jizev|jizvy na \w+ dokaze lecit/],
  ['narrative-authority', /obsahov\w* pravomoc|hrac muze[^.]{0,40}(urcit|stanovit)|hrac muze popsat/],
  ['stealth-evasion', /ukryt|setrast/],
  ['tracking', /stopovat/],
  ['disguise', /vydavat za nekoho/],
  ['improvised-gear', /nouzovw* (vrhaci )?zbran|pouzivat plaste|jako by to byl stit/],
  ['transform', /promenit/],
  ['dominate', /ovladnout/],
  ['animate-construct', /probudit|ozivenw+, ktery/],
  ['mark-detect', /oznaci|cil oznac/],
  ['spell-reflect', /ochranit sama sebe proti jakemukoliv kouzlu/],
  ['craft', /vyrobit|vyrabet|pri vyrobe|vyrobu/],
  ['spell-enhance', /(seslat|sesila)\w* (posilen|plosn)|posilene kouzlo|posilene znameni|posilene prokleti/],
  ['ward-sign', /ochrann\w+ obraz[ce]c/],
  ['unusual-sense', /(neobvyklym|zvlastnim) smyslem|zvlastni smysl/],
  ['gain-advantage', /vyhod/],
  ['companion', /pomocnik/],
  ['assess-abilities', /urcit i jeho zvlastni|zjistit i jeho zvlastni/],
  ['heal', /leceni|lecit|uzdrav/],
];
const KINDS = [['people', /\b(lid|clovek|lidem|lidi)\w*/], ['animals', /zvir\w+/], ['monsters', /netvor\w*/], ['undead-fiends', /nemrtv\w*|bes\w*|nezivych|nezivy\w*|nezivi/], ['constructs', /ozivene\w*|ozivenych|ozivenemu/]];

const items = inv.items.filter((i) => i.type === 'zs' || i.type === 'skill');
const skills = items.filter((i) => i.type === 'skill');
const skillStems = skills.map((s) => ({ id: s.id, words: fold(s.name).split(' ').filter((w) => w.length >= 3).map((w) => ({ re: new RegExp('(^|[^a-z])' + (w.length <= 3 ? w : w.length <= 5 ? w.slice(0, -1) : w.slice(0, -2))) })) }));
const relatedSkills = (t) => {
  // jen kurzíva (názvy dovedností); tučné (***Zdroje***) se vynechá, sousední kurzívy se spojí.
  // Všechna slova názvu se musí najít v jedné a téže kurzívě; kmen se hledá od začátku slova (u slov do 5 písmen se krátí jen o 1 znak, aby „Umění“ nezachytilo „Umělý“).
  const src = (t ?? '').replace(/\*\*\*[^*]*\*\*\*/g, ' ').replace(/\*\s+(?:[^\s*]{1,3}\s+)?\*/g, ' ');
  const spans = (src.match(/(?<!\*)\*([^*]+)\*(?!\*)/g) ?? []).map(fold);
  return skillStems.filter((s) => spans.some((f) => s.words.every((w) => w.re.test(f)))).map((s) => s.id.replace('dovednost:', ''));
};

const zs = items.filter((i) => i.type === 'zs').map((i) => {
  const t = fold(i.text);
  const mech = MECH.filter(([, re]) => re.test(t)).map(([k]) => k);
  const cost = [...strip(i.text).matchAll(/\(Aktivace ([^)]*)\)/g)].map((m) => m[1].replace(/\s+/g, ' '));
  const area = /plosn/.test(t) ? 'area' : null;
  // mechanismy po odstavcích (zdrojový text má pasivní a aktivované části v samostatných odstavcích)
  const paraMech = String(i.text ?? '').split(/\n\s*\n/).map((p) => MECH.filter(([, re]) => re.test(fold(p))).map(([k]) => k));
  return { ...i, mech: mech.length ? mech : ['other'], cost, area, paraMech,
    kinds: KINDS.filter(([, re]) => re.test(t)).map(([k]) => k), skills: relatedSkills(i.text),
    cls: i.source.split(':').slice(0, 3).join(':') };
});

// ---- Dovednosti: oblast ----
const AREA = [
  ['combat-melee', /boj zblizka|jizdni boj/], ['combat-ranged', /strelba|vrh|boj zdalky/], ['combat-vs-kind', /boj proti|boj zblizka proti/],
  ['magic-school', /^magie |zarikani|znameni|hadacstvi/], ['craft-production', /vyroba|kovarstvi|tesarina|padelatelstvi|nektary|mechanismy/],
  ['craft-use', /pouzivani|podavani|pouziti/], ['healing', /osetrovani|leceni|obnovovani/],
  ['knowledge', /znalosti|ucenost|znalost/], ['social-direct', /vyjednavani|jednani|charisma|sebeduvera|umeni|prevleky|ovlivnovani/],
  ['social-network', /pusobeni/], ['leadership', /vedeni/], ['movement-survival', /pohyblivost|cestovani|akrobacie|orientace|tabornictvi|sila|odolnost|vule|kocary|triky/],
  ['secrecy', /utajovani/],
];
const sk = skills.map((s) => {
  const n = fold(s.name);
  const area = AREA.filter(([, re]) => re.test(n)).map(([k]) => k);
  return { ...s, area: area.length ? area : ['other'], cls: s.source.split(':').slice(0, 3).join(':') };
});

// ---- Výstup ----
const tally = (arr, f) => { const m = new Map(); for (const x of arr) for (const k of [].concat(f(x))) m.set(k, [...(m.get(k) ?? []), x]); return [...m].sort((a, b) => b[1].length - a[1].length); };
const out = [];
const log = (s = '') => { out.push(s); console.log(s); };
const ex = (xs, n = 3) => xs.slice(0, n).map((x) => x.name).join(', ');

log('# ZS: mechanismus (víc hodnot na kartu)');
for (const [k, xs] of tally(zs, (z) => z.mech)) log(`${String(xs.length).padStart(4)}  ${k.padEnd(22)} např. ${ex(xs)}`);
log(`\nKaret s právě jedním mechanismem: ${zs.filter((z) => z.mech.length === 1).length} / ${zs.length}; „other“: ${zs.filter((z) => z.mech[0] === 'other').length}`);
log('\n# ZS: atribut');
for (const [k, xs] of tally(zs, (z) => z.attribute ?? 'none')) log(`${String(xs.length).padStart(4)}  ${k}`);
log('\n# ZS: cena aktivace');
for (const [k, xs] of tally(zs, (z) => (z.cost.length ? z.cost.map((c) => c.replace(/Vlivy|Vliv/, 'Vliv').replace(/Suroviny|Surovin(a)?/, 'Surovina')) : 'bez')))
  log(`${String(xs.length).padStart(4)}  ${k}`);
log('\n# ZS: cílová bytost uvedená v textu');
for (const [k, xs] of tally(zs, (z) => (z.kinds.length ? z.kinds : 'neuvedeno'))) log(`${String(xs.length).padStart(4)}  ${k}`);
log(`\n# ZS: související dovednost (z textu) – karet s alespoň jednou: ${zs.filter((z) => z.skills.length).length} / ${zs.length}`);
for (const [k, xs] of tally(zs, (z) => z.skills).slice(0, 12)) log(`${String(xs.length).padStart(4)}  ${k}`);
log('\n# ZS: plošné (area): ' + zs.filter((z) => z.area).length);
log('\n# ZS: nepokryté mechanismem („other“)');
for (const z of zs.filter((z) => z.mech[0] === 'other')) log(`  ${z.id.replace('schopnost:', '')}: ${strip(z.text).slice(0, 110)}`);

log('\n# Dovednosti: oblast');
for (const [k, xs] of tally(sk, (s) => s.area)) log(`${String(xs.length).padStart(4)}  ${k.padEnd(20)} např. ${ex(xs)}`);
log(`„other“: ${sk.filter((s) => s.area[0] === 'other').map((s) => s.name).join(', ')}`);
log('\n# Dovednosti: atribut');
for (const [k, xs] of tally(sk, (s) => s.attribute ?? 'none')) log(`${String(xs.length).padStart(4)}  ${k}`);
log('\n# Dovednosti: počet odrážek');
for (const [k, xs] of tally(sk, (s) => String(s.items.length))) log(`${String(xs.length).padStart(4)}  ${k}`);

writeFileSync(resolve(root, 'reference/work/kartoteky-taxonomie-nahled.json'), JSON.stringify({ zs, skills: sk }, null, 1));
