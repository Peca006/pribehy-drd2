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
  // sady výbavy: jen název a hotovost (bez řádků s popisem výzbroje a výstroje)
  startingKits: (src.startingKits ?? []).map((k) => ({ ...pick(k, ['id', 'name', 'cash']), lines: [] })),
  creation: src.creation,
}

writeFileSync('src/data/skeleton.json', JSON.stringify(skeleton, null, 1) + '\n')
const abilities = skeleton.professions.reduce((n, p) => n + p.abilities.length, 0)
console.log(
  `kostra: povolání ${skeleton.professions.length}, schopností ${abilities}, ras ${skeleton.races.length}, rysů ${skeleton.traits.length}`,
)
