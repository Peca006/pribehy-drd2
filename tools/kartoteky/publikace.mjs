// Balíček ke sdílení (docs/kartoteky): export pro Kostku, plný export všech našich atributů, JSON a README se slovníkem.
// Pořadí: inventar -> taxonomie -> fafrin -> dovednosti -> export -> publikace. Texty karet se berou z exportu pro Kostku (stejné znění).
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MECHANISM, DOMAIN, SUBJECT, TARGET_KIND, ATTRIBUTE, RESOURCE, MANEUVER, RACE } from './slovnik.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const work = (f) => resolve(root, 'reference/work', f);
const out = resolve(root, 'docs/kartoteky');
mkdirSync(out, { recursive: true });
const cards = JSON.parse(readFileSync(work('kartoteky-karty.json'), 'utf8'));
const ENV = { wilderness: 'Divočina', city: 'Město' };
const ORIGIN = { 'class-basic': 'základní povolání', 'class-advanced': 'pokročilé povolání', race: 'rasa', bestiary: 'Bestiář' };

const cs = (M, ids) => ids.map((i) => M[i]?.cs ?? i).join(', ');
const cost = (a) => (a.length ? [...new Set(a.map((x) => `${RESOURCE[x.resource]}: ${x.amount}`))].join(', ') : 'Bez Aktivace');
const part = (p) => `${p.mechanism.length ? p.mechanism.map((m) => MECHANISM[m]?.cs ?? m).join(' + ') : 'bez mechanismu'}${p.condition ? ' (' + p.condition + ')' : ''} [${cost(p.activationCost)}${p.note ? '; ' + p.note : ''}]`;
const dial = (k, v) => (v ? `${k}="${String(v).replace(/"/g, '&quot;')}"` : null);

// texty z exportu pro Kostku (tělo karty mezi hlavičkou a koncovou značkou)
const bodies = (file, tag) => {
  const m = new Map();
  for (const b of readFileSync(work('kartoteky-export/' + file), 'utf8').matchAll(new RegExp(`<${tag}\\s*\\n([\\s\\S]*?)\\n>\\n([\\s\\S]*?)</${tag}>`, 'g'))) {
    m.set(b[1].match(/^name="(.*)"$/m)[1], b[2].replace(/^\n+|\n+$/g, ''));
  }
  return m;
};
const zsBody = bodies('drd2-zs.md', 'drd2-zs'), skBody = bodies('drd2-skill.md', 'drd2-skill');

const zsFull = cards.filter((c) => c.type === 'zs').map((c) => [
  '<drd2-zs', dial('id', c.id), dial('name', c.name), dial('source', c.source === 'srd' ? 'SRD' : c.source), dial('rulebook', c.rulebook),
  dial('origin-kind', ORIGIN[c.origin.kind]), dial('origin', c.origin.kind === 'bestiary' ? '' : c.origin.name), dial('attribute', ATTRIBUTE[c.attribute]),
  dial('mechanism', cs(MECHANISM, c.mechanism)), dial('parts', c.parts.map(part).join('; ')), dial('domain', cs(DOMAIN, c.domain)), dial('subject', cs(SUBJECT, c.subject)),
  dial('target-kind', cs(TARGET_KIND, c.targetKind)), dial('activation-cost', c.parts.map((p) => cost(p.activationCost)).join('; ')),
  dial('related-skill', c.relatedSkill.map((r) => r.name).join(', ')), dial('mass', c.mass ? 'ano' : ''),
  dial('quick-pick', c.quickPick), dial('monster', c.monster ? 'ano' : ''), dial('bestiary-kind', { talent: 'talent', sense: 'neobvyklý smysl' }[c.bestiaryKind] ?? ''), dial('used-by', (c.usedBy ?? []).join(', ')), dial('labels', c.labels === 'manual' ? 'ruční revize' : 'automaticky'),
  dial('supplemented', (c.supplemented ?? []).join(', ')), '>', '', zsBody.get(c.name) ?? '', '', '</drd2-zs>', ''].filter((x) => x !== null).join('\n')).join('\n');
const skFull = cards.filter((c) => c.type === 'skill').map((c) => [
  '<drd2-skill', dial('id', c.id), dial('name', c.name), dial('source', 'SRD'), dial('rulebook', c.rulebook), dial('origin-kind', ORIGIN[c.origin.kind]), dial('origin', c.origin.name),
  dial('attribute', ATTRIBUTE[c.attribute]), dial('domain', cs(DOMAIN, c.domain)), dial('environment', c.environment.map((e) => ENV[e]).join(', ')),
  dial('target-kind', cs(TARGET_KIND, c.targetKind)), dial('target-attribute', ATTRIBUTE[c.targetAttribute] ?? ''), dial('labels', c.labels === 'manual' ? 'ruční revize' : 'automaticky'),
  '>', '', skBody.get(c.name) ?? '', '', '</drd2-skill>', ''].filter((x) => x !== null).join('\n')).join('\n');

writeFileSync(resolve(out, 'drd2-zs-plne.md'), zsFull);
writeFileSync(resolve(out, 'drd2-skill-plne.md'), skFull);
copyFileSync(work('kartoteky-export/drd2-zs.md'), resolve(out, 'drd2-zs-kostka.md'));
copyFileSync(work('kartoteky-export/drd2-skill.md'), resolve(out, 'drd2-skill-kostka.md'));
writeFileSync(resolve(out, 'kartoteky.json'), JSON.stringify(cards, null, 1));

// ---- README se slovníkem ----
const table = (M, withKostka = true) => `| id | Česky | Hodnota v Kostce |\n|---|---|---|\n${Object.entries(M).map(([id, v]) => `| \`${id}\` | ${v.cs} | ${withKostka ? v.kostka.join(' / ') : ''} |`).join('\n')}`;
const count = (f) => cards.filter(f).length;
const usage = (field, M) => Object.keys(M).map((id) => [id, count((c) => c.type === 'zs' && c[field].includes(id))]);
const readme = `# Kartotéky DrD2: karty ZS a dovedností

Karty zvláštních schopností (ZS) a dovedností z Příručky a Bestiáře Dračího doupěte 2 (SRD), ve formátu navazujícím na Kartotéky Kostky.
Obsah: ${count((c) => c.type === 'zs' && c.rulebook === 'Příručka')} ZS Příručky, ${count((c) => c.type === 'zs' && c.rulebook === 'Bestiář')} ZS Bestiáře, ${count((c) => c.type === 'skill')} dovedností.

## Soubory

| Soubor | Co obsahuje |
|---|---|
| \`drd2-zs-kostka.md\`, \`drd2-skill-kostka.md\` | Varianta pro Kostku: atributy přeložené na hodnoty, které Kostka zná (\`effect\`, \`purpose\`, \`activation-cost\`, \`related-skill\`, …), ve stejném formátu jako Fafrinova sada. |
| \`drd2-zs-plne.md\`, \`drd2-skill-plne.md\` | Plná varianta: všechny naše atributy se samostatnými poli (\`mechanism\`, \`domain\`, \`subject\`, \`target-kind\`, \`parts\`, …). |
| \`kartoteky.json\` | Totéž strojově: stabilní anglická \`id\` hodnot, strukturované ceny, díly karty. |
| \`README.md\` | Tento popis a slovník hodnot. |

## Rozdíl proti Kostce

Kostka má pro účinek jednu hodnotu (\`effect\`) a pro „účel“ směs oblasti, předmětu a cíle (\`purpose\`: Boj, Jedy, Zvířata, Jizvy…). Naše taxonomie to dělí:

- **mechanism**: co schopnost dělá (Nadání, Zběhlost, Manévr zdarma, Přirozená ochrana…). Jedna karta jich může mít víc.
- **domain**: v jaké oblasti hry se projeví (Boj, Jednání, Skrývání, Znalosti, Magie, Léčení, Výroba, Pohyb, Pomocníci, Odhad). Tentýž slovník se používá u dovedností jako \`domain\` (v Kostce \`type\`).
- **subject**: čeho se týká (Obrazce, Jedy, Pasti, Masti, Substance, Trofeje, Zřídla, Rituální předměty).
- **target-kind**: na koho působí (Lidé, Zvířata, Netvoři, Nemrtví a neživí, Běsi, Oživení). U ZS s navázanou dovedností se dědí z dovednosti, pokud není u karty ručně určen.
- **parts a activation-cost**: karta se skládá z částí (odstavců zdroje). Každá část má vlastní mechanismy a cenu aktivace; části se oddělují středníkem a pozice odpovídá pozici v \`effect\` i \`activation-cost\` ve variantě pro Kostku. Cena „Bez Aktivace“ znamená, že část nic nestojí. Poznámka u části (\`parts\`, hranaté závorky) je platba, která není Aktivací.
- **mass**: ano = schopnost působí plošně nebo na více cílů.
- **labels**: \`ruční revize\` = hodnoty domain, subject, target-kind prošel člověk; \`automaticky\` = odvozeno z textu a z navázané dovednosti.
- **supplemented**: pole doplněná, protože chybí ve zdroji (zatím jen Zloději těl: atribut Duše a aktivace 1 Duše, na doporučení komunity).
- Jizvy jsou u nás mechanismus (\`scar-effect\`, „Účinek na Jizvy“); do pole \`purpose\` pro Kostku se přidávají při exportu.
- Zdroj je vždy \`SRD\` (rulebook Příručka nebo Bestiář). Název karty je klíč, \`id\` je stabilní slug.
- **quick-pick**: číslo „rychlého výběru“ ze zdroje (úroveň povolání, u ras kultura). **monster**: ano = schopnost z Bestiáře.
- **bestiary-kind** a **used-by**: u záznamů z řádků statistik tvorů v Bestiáři. „talent“ je podmíněná zběhlost nebo bravura (každá podmínka je samostatná část v \`parts\`, v závorce), „neobvyklý smysl“ je neobvyklý smysl (Duše). \`used-by\` jsou tvorové, kteří záznam mají. Rasová ZS Noční oči se u tvorů znovu nevytváří.

## Slovník hodnot

### Zdroje a atributy
Atributy: ${Object.entries(ATTRIBUTE).map(([k, v]) => `\`${k}\` = ${v}`).join(', ')}.
Zdroje v cenách: ${Object.entries(RESOURCE).map(([k, v]) => `\`${k}\` = ${v}`).join(', ')}.

### Mechanismus (mechanism)
${table(MECHANISM)}

Počty karet: ${usage('mechanism', MECHANISM).filter(([, n]) => n).map(([id, n]) => `${id} ${n}`).join(', ')}.

### Doména (domain)
${table(DOMAIN)}

### Předmět (subject)
${table(SUBJECT)}

### Druh cíle (target-kind)
${table(TARGET_KIND)}

### Prostředí dovedností (environment)
Divočina, Město.

### Původ (origin-kind)
${Object.entries(ORIGIN).map(([k, v]) => `\`${k}\` = ${v}`).join(', ')}.

## Jak to používat pro filtrování

V Kostce lze filtrovat podle \`domain\`, \`subject\` a \`target-kind\` zvlášť (například doména Magie a cíl Lidé) bez míchání do jednoho pole \`purpose\`. Hodnoty varianty „plné“ jsou česky, shodné se slovníkem výše; \`kartoteky.json\` obsahuje stabilní \`id\`.

## Zdroj dat a vznik

Skripty jsou ve složce \`tools/kartoteky\` (inventář, taxonomie, slovník, export, ověření), rozhodnutí v \`PLAN.md\`, \`TAXONOMIE.md\` a \`DOVEDNOSTI-NAVRH.md\`. Texty pocházejí z veřejného balíčku SRD. Hodnoty \`domain\`, \`subject\` a \`target-kind\` u ZS Příručky byly ručně revidovány (viz \`rucni-stitky.json\`), cíle dovedností a prostředí jsou odvozeny pravidly. Kontrola proti Fafrinově sadě 86 karet (atribut, úroveň, povolání, rasa, kniha 86/86, related-skill 83/86, activation-cost 84/86).
`;
writeFileSync(resolve(out, 'README.md'), readme);
console.log('Publikace:', out);
