// Vytvoří vestavěný „kostrový“ balíček (src/data/skeleton.json) z lokálního balíčku pravidel: jen názvy,
// ID, vlastnosti, úrovně doporučené volby a číselné parametry tvorby – bez popisů, textů pravidel, jmen,
// ceníku a výbavy. Aplikace s ním funguje i bez nahraného balíčku; plný balíček položky přepisuje podle ID.
// Použití: node tools/srd/build.mjs && node tools/srd/build-skeleton.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const src = JSON.parse(readFileSync('content-packs/local/drd2-pravidla-2.json', 'utf8'))

const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]))
const ability = (a) => ({ ...pick(a, ['id', 'name', 'attribute', 'attributeNote', 'quickPickLevel', 'quickPickCulture']), text: '' })

const skeleton = {
  manifest: {
    format: 1,
    id: 'drd2-kostra',
    name: 'Vestavěný přehled (názvy a čísla)',
    version: '1.0.0',
    source: { book: 'Dračí doupě 2', edition: '2' },
  },
  professions: src.professions.map((p) => ({
    ...pick(p, ['id', 'name', 'kind']),
    intro: '',
    skills: p.skills.map((s) => ({ ...pick(s, ['id', 'name', 'attribute', 'attributeNote']), items: [] })),
    abilities: p.abilities.map(ability),
  })),
  races: src.races.map((r) => ({
    ...pick(r, ['id', 'name']),
    text: '',
    names: [],
    cultures: r.cultures.map((c) => ({ ...pick(c, ['id', 'name', 'alias']), text: '' })),
    abilities: r.abilities.map(ability),
  })),
  commonRaceAbilities: src.commonRaceAbilities.map(ability),
  traits: src.traits.map((t) => ({ ...pick(t, ['id', 'name']), text: '' })),
  creation: src.creation,
}

writeFileSync('src/data/skeleton.json', JSON.stringify(skeleton, null, 1) + '\n')
const abilities = skeleton.professions.reduce((n, p) => n + p.abilities.length, 0)
console.log(
  `kostra: povolání ${skeleton.professions.length}, schopností ${abilities}, ras ${skeleton.races.length}, rysů ${skeleton.traits.length}`,
)
