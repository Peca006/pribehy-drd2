// Vytvoří vestavěný „kostrový“ balíček (src/data/skeleton.json) z lokálního balíčku pravidel: jen názvy,
// ID, vlastnosti, úrovně doporučené volby a číselné parametry tvorby – bez popisů, textů pravidel, jmen,
// ceníku a výbavy. Aplikace s ním funguje i bez nahraného balíčku; plný balíček položky přepisuje podle ID.
// Použití: node tools/srd/build.mjs && node tools/srd/build-skeleton.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const src = JSON.parse(readFileSync('content-packs/local/drd2-pravidla-2.json', 'utf8'))

// Odkazy do SRD (cesta + kotva nadpisu); samotné adresy webu jsou v aplikaci (`SRD_BASE`).
const plain = (t) => t.replace(/\*/g, '').trim()
const chapterBlocks = (prefix) => src.chapters.find((c) => c.id.startsWith(prefix))?.blocks ?? []
const chapterPath = (prefix) =>
  `zakladni-prirucka/${src.chapters.find((c) => c.id.startsWith(prefix)).id}.html`
const link = (prefix, anchor) => (anchor ? `${chapterPath(prefix)}#${anchor}` : chapterPath(prefix))
/** Nadpisy (ID a text) jednoho oddílu úrovně `level`, který začíná nadpisem s textem `title`. */
function section(prefix, level, title) {
  const bs = chapterBlocks(prefix)
  const i = bs.findIndex(
    (b) =>
      b.type === 'heading' &&
      b.level === level &&
      plain(b.text).toLowerCase() === title.toLowerCase(),
  )
  if (i < 0) return []
  const out = []
  for (const b of bs.slice(i)) {
    if (b.type !== 'heading') continue
    if (out.length && b.level <= level) break
    out.push(b)
  }
  return out
}
/** Kotva nadpisu v oddílu, jehož text je název (nebo začíná názvem a závorkou); jinak kotva oddílu. */
function anchorIn(heads, name) {
  const n = name.toLowerCase()
  const h = heads.slice(1).find(
    (x) =>
      plain(x.text).toLowerCase() === n ||
      plain(x.text)
        .toLowerCase()
        .startsWith(n + ' ('),
  )
  return h?.id ?? heads[0]?.id
}

const pick = (o, keys) =>
  Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]))
const ability = (a, srd) => ({
  ...pick(a, ['id', 'name', 'attribute', 'attributeNote', 'quickPickLevel', 'quickPickCulture']),
  ...(srd ? { srd } : {}),
  text: '',
})

// Holé názvy položek sad výbavy (bez popisů a cen), ručně vybrané; sestavení hlídá kontrola výše.
const MAX_GEAR = 30
const KIT_GEAR = {
  'vybava:obycejna': ['zbraň', 'oblečení', 'torna', 'křesadlo', 'měch na vodu', 'jídlo na tři dny'],
  'vybava:cenena': [
    'dvě zbraně',
    'cestovní oblečení',
    'torna',
    'křesadlo',
    'lano',
    '2 pochodně',
    'přikrývka',
    'měch na vodu',
    'jídlo na pět dní',
  ],
  'vybava:draha': [
    'zbroj',
    'dvě zbraně',
    'drahé oblečení',
    'torna',
    'křesadlo',
    'lano',
    'lucerna',
    'olej',
    'pokrývka',
    'měch na vodu',
    'pergameny',
    'svíčky',
    'jídlo na týden',
  ],
}

const skeleton = {
  manifest: {
    format: 1,
    id: 'drd2-kostra',
    name: 'Vestavěný přehled (názvy a čísla)',
    version: '1.0.0',
    source: { book: 'Dračí doupě 2', edition: '2' },
  },
  professions: src.professions.map((p) => {
    const prefix = p.kind === 'zakladni' ? '25' : '26'
    const heads = section(prefix, 2, p.name)
    return {
      ...pick(p, ['id', 'name', 'kind', 'requires']),
      srd: link(prefix, heads[0]?.id),
      intro: '',
      skills: p.skills.map((s) => ({
        ...pick(s, ['id', 'name', 'attribute', 'attributeNote']),
        items: [],
      })),
      abilities: p.abilities.map((a) => ability(a, link(prefix, anchorIn(heads, a.name)))),
    }
  }),
  races: src.races.map((r) => {
    const heads = section('24', 2, r.name)
    const ids = new Set(
      chapterBlocks('24')
        .filter((b) => b.type === 'heading')
        .map((b) => b.id),
    )
    return {
      ...pick(r, ['id', 'name']),
      srd: link('24', heads[0]?.id),
      text: '',
      names: [],
      cultures: r.cultures.map((c) => {
        const tail = c.id.split('/').pop()
        return {
          ...pick(c, ['id', 'name', 'alias']),
          srd: link('24', ids.has(tail) ? tail : heads[0]?.id),
          text: '',
        }
      }),
      abilities: r.abilities.map((a) => ability(a, link('24', anchorIn(heads, a.name)))),
    }
  }),
  commonRaceAbilities: src.commonRaceAbilities.map((a) =>
    ability(
      a,
      link(
        '24',
        chapterBlocks('24').find(
          (b) => b.type === 'heading' && plain(b.text).toLowerCase() === a.name.toLowerCase(),
        )?.id,
      ),
    ),
  ),
  traits: src.traits.map((t) => ({
    ...pick(t, ['id', 'name']),
    srd: link(
      '23',
      chapterBlocks('23').find(
        (b) => b.type === 'heading' && plain(b.text).toLowerCase() === t.name.toLowerCase(),
      )?.id,
    ),
    text: '',
  })),
  // sady výbavy: název, hotovost a holý výčet položek (krátké názvy, bez popisů a cen); řádky zůstávají prázdné
  startingKits: (src.startingKits ?? []).map((k) => {
    const gear = KIT_GEAR[k.id] ?? []
    const text = k.lines.map((l) => l.text).join(' ').toLowerCase()
    for (const g of gear) {
      // každá položka musí mít oporu ve zdroji (první slovo bez koncovky) a být krátká
      const word = g.replace(/^\d+ |^(dvě|dvou) /, '').split(' ')[0].slice(0, 4).toLowerCase()
      if (!text.includes(word)) throw new Error(`položka „${g}“ nemá oporu v sadě ${k.id}`)
      if (g.length > MAX_GEAR) throw new Error(`položka „${g}“ je příliš dlouhá`)
    }
    return {
      ...pick(k, ['id', 'name', 'cash']),
      lines: [],
      gear,
      priceSrd: link('33', 'cenik-vybaveni'),
    }
  }),
  creation: src.creation,
}

writeFileSync('src/data/skeleton.json', JSON.stringify(skeleton, null, 1) + '\n')
const abilities = skeleton.professions.reduce((n, p) => n + p.abilities.length, 0)
console.log(
  `kostra: povolání ${skeleton.professions.length}, schopností ${abilities}, ras ${skeleton.races.length}, rysů ${skeleton.traits.length}`,
)
