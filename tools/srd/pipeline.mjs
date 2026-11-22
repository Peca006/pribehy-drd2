// Sestavení balíčků ze stránek SRD jako čisté funkce nad řetězci HTML (bez souborů a bez `sharp`), aby je mohl
// použít jak Node nástroj (`build.mjs`, `build-bestiar.mjs`), tak bookmarklet běžící na stránce SRD v prohlížeči.
// Texty SRD tak nikdy neopouštějí zařízení uživatele.
import buildNumber from '../../src/data/pack-build.json' with { type: 'json' }
import { parseProfessions } from './parse-povolani.mjs'
import { parse } from 'node-html-parser'
import { parseBlocks, parseChapter } from './parse-chapter.mjs'
import { KINDS, parseCreatures, parseRulesCreatures } from './parse-bestiar.mjs'
import {
  CREATION_RULES,
  deriveEquipment,
  deriveRaces,
  deriveRequirements,
  deriveStartingKits,
  deriveGlossary,
  deriveTerms,
  deriveTraits,
} from './derive.mjs'

const RULES_ID = 'drd2-pravidla-2'
/** Číslo sestavení balíčků; musí odpovídat `EXPECTED_BUILD` v `src/core/content/builds.ts` (hlídá test). */
export const PACK_BUILD = buildNumber.build

/** Stránky Základní příručky a Bestiáře (název souboru bez `.html`), kdyby je nešlo zjistit z navigace. */
export const RULES_PAGES = [
  '11-co-jsou-hry-na-hrdiny',
  '12-priklad-hry',
  '21-dobrodruzi',
  '22-ukazkove-postavy',
  '23-tvorba-hrdiny',
  '24-rasy',
  '25-zakladni-povolani',
  '26-pokrocila-povolani',
  '31-zakladni-pravidla',
  '32-slozitejsi-situace',
  '33-vybaveni',
  '34-pomocnici-a-site',
  '35-pouzivani-dovednosti',
  '36-kouzla-nastrahy-leceni',
  '37-zvlastni-schopnosti',
  '38-zkusenosti-a-zlepsovani-postavy',
  '41-priprava-a-vedeni-hry',
  '42-inspirace-pro-dobrodruzstvi',
  '43-bestiar',
  '44-navrat-do-bileho-hradu',
]
export const BESTIAR_PAGES = [
  '01-uvod',
  '02-lide',
  '03-zvirata',
  '04-nemrtvi',
  '05-besi',
  '06-netvori',
]

// Opravy SRD podle tištěné knihy (drd2-pravidla.pdf); viz `npm run compare:srd`. Počet zásahů je pevně daný.
/** @type {[string, string, number][]} */
const PDF_FIXES = [
  ['Vyberte si jednu rasovou základní schopnost', 'Vyberte si jednu rasovou zvláštní schopnost', 1],
  ['*Výrobě elixírů* a *Podávání* *elixírů', '*Výrobě elixírů* a *Používání* *elixírů', 2],
]
// Chyby sazby ve zdrojovém HTML SRD (ověřeno proti PDF, `node tools/srd/compare-bestiar.mjs`).
const HTML_FIXES = [
  ['mavku lze vyhé svobodit', 'mavku lze vysvobodit'],
  ['Mnoz nich jsou', 'Mnohé z nich jsou'],
  [
    'naposlebůžkům, dy. Neuváženě jsem se vysmívala lidským a když',
    'naposledy. Neuváženě jsem se vysmívala lidským bůžkům, a když',
  ],
]

/**
 * Názvy stránek sekce SRD z odkazů na stránce (`/sekce/NN-nazev.html`); když jich je méně než známých,
 * platí pevný seznam `fallback`.
 */
export function discoverPages(hrefs, section, fallback) {
  const re = new RegExp(`/${section}/(\\d\\d-[a-z0-9-]+)\\.html`)
  const found = new Set()
  for (const h of hrefs) {
    const m = (h ?? '').match(re)
    if (m) found.add(m[1])
  }
  return found.size >= fallback.length ? [...found].sort() : fallback
}

export const basename = (p) => p.split('/').pop().split(/[?#]/)[0]

/** Projde bloky kapitoly (i vnořené) a zavolá `fn` pro každý blok `image`. */
export function walkImages(blocks, fn) {
  for (const b of blocks) {
    if (b.type === 'image') fn(b)
    else if (b.blocks) walkImages(b.blocks, fn)
  }
}

/**
 * Nahradí `src` obrázků data URI. `load(src)` vrátí data URI (v Node přes `sharp`, v prohlížeči přes canvas)
 * a volá se jednou pro každý soubor. Vrací počet obrázků.
 */
export async function embedImagesWith(chapters, load) {
  const cache = new Map()
  for (const ch of chapters) {
    const jobs = []
    walkImages(ch.blocks, (b) => jobs.push(b))
    for (const b of jobs) {
      if (b.src.startsWith('data:')) continue
      const file = basename(b.src)
      if (!cache.has(file)) cache.set(file, await load(b.src, file))
      b.src = cache.get(file)
    }
  }
  return cache.size
}

/** Části Základní příručky podle prvního znaku ID kapitoly (názvy z menu SRD). */
export const RULES_PARTS = [
  { id: 'uvod', name: 'Úvod do hry', digit: '1' },
  { id: 'tvorba', name: 'Tvorba postav', digit: '2' },
  { id: 'hrani', name: 'Hraní hry', digit: '3' },
  { id: 'vypraveni', name: 'Vyprávění příběhů', digit: '4' },
]

/** Základní příručka: `pages` = { '25-zakladni-povolani': html, … }. Obrázky se doplní až `embedImagesWith`. */
export function buildRulesChapters(pages) {
  const names = Object.keys(pages).sort()
  const professions = [
    ...parseProfessions(pages['25-zakladni-povolani'], 'zakladni'),
    ...parseProfessions(pages['26-pokrocila-povolani'], 'pokrocile'),
  ]
  const chapters = names.map((n) => parseChapter(pages[n], n))
  for (const ch of chapters) {
    const part = RULES_PARTS.find((p) => p.digit === ch.id[0])
    if (part) ch.part = part.id
  }
  // bytosti z kapitoly Bestiář (kratší popisy; prostředí u nich kniha neuvádí)
  const creatures = pages['43-bestiar'] ? parseRulesCreatures(pages['43-bestiar'], RULES_ID) : []
  return { professions, chapters, creatures }
}

/** Dokončí balíček pravidel (po vložení obrázků do `chapters`). Vrací { json, problems }. */
/** @param {{ professions: any[], chapters: any[], creatures?: any[] }} built */
export function finishRulesPack({ professions, chapters, creatures = [] }) {
  const problems = []
  const requirements = deriveRequirements(chapters, professions)
  for (const p of professions) if (requirements.has(p.id)) p.requires = requirements.get(p.id)
  const { races, common } = deriveRaces(chapters)
  /** @type {any} */
  const pack = {
    manifest: {
      format: 1,
      id: RULES_ID,
      name: 'Dračí doupě 2 – Pravidla (SRD)',
      version: '2.0.0',
      build: PACK_BUILD,
      source: { book: 'Dračí doupě 2: Pravidla (SRD, drd2srd.d20.cz)', edition: '2' },
      parts: RULES_PARTS.filter((p) => chapters.some((c) => c.part === p.id)).map(({ id, name }) => ({ id, name })),
    },
    chapters,
    professions,
    races,
    commonRaceAbilities: common,
    traits: deriveTraits(chapters),
    equipment: deriveEquipment(chapters),
    startingKits: deriveStartingKits(chapters),
    creation: CREATION_RULES,
    terms: [],
    ...(creatures.length ? { creatureKinds: Object.values(KINDS), creatures } : {}),
  }
  pack.terms = deriveGlossary(pack, deriveTerms(chapters))
  let json = JSON.stringify(pack, null, 1)
  for (const [from, to, expected] of PDF_FIXES) {
    const n = json.split(from).length - 1
    if (n !== expected) problems.push(`Oprava podle PDF zasáhla ${n}× místo ${expected}×: ${from}`)
    else json = json.split(from).join(to)
  }
  const bad = professions.filter((p) => p.abilities.length !== 12 || !p.skills.length)
  if (bad.length)
    problems.push(
      `Podezřelá povolání (očekává se 12 schopností a aspoň 1 dovednost): ${bad.map((p) => p.name).join(', ')}`,
    )
  return { json, problems, pack }
}

/** Kapitoly Bestiáře: úvod rozdělený podle nadpisů druhé úrovně a úvodní texty jednotlivých druhů bytostí. */
const KIND_CHAPTER_ORDER = ['21', '22', '23', '24', '25']

/** Vrací { chapters, home }; `home`: ID nadpisu ze starého úvodu → { chapter, top } (top = nadpis se stal názvem kapitoly). */
export function bestiarChapters(fixed, problems = []) {
  const intro = parseChapter(fixed('01-uvod'), '01-uvod')
  const chapters = []
  /** @type {Record<string, any>} */
  const home = {}
  /** @type {any} */
  let cur
  for (const b of intro.blocks) {
    if (b.type === 'heading' && b.level === 2) {
      cur = { id: `1${chapters.length + 1}-${b.id}`, title: b.text, blocks: [] }
      chapters.push(cur)
      home[b.id] = { chapter: cur.id, top: true }
    } else if (cur) {
      cur.blocks.push(b)
      if (b.type === 'heading') home[b.id] ??= { chapter: cur.id, top: false }
    } else problems.push('Úvod Bestiáře má text před prvním nadpisem druhé úrovně')
  }
  Object.keys(KINDS).forEach((file, i) => {
    // úvodní text druhu je vše před první bytostí (h3)
    const content = parse(fixed(file)).querySelector('#content')
    if (!content) throw new Error(`Stránka ${file} nemá #content.`)
    const kids = content.childNodes
    const at = kids.findIndex((n) => n.rawTagName?.toLowerCase() === 'h3')
    if (at >= 0) for (const n of kids.slice(at)) n.remove()
    const page = { blocks: parseBlocks(content) }
    if (!page.blocks.length) problems.push(`Druh ${file} nemá úvodní text`)
    chapters.push({
      id: `${KIND_CHAPTER_ORDER[i]}-${KINDS[file].id}`,
      title: KINDS[file].name,
      kind: KINDS[file].id,
      blocks: page.blocks,
    })
  })
  chapters.sort((x, y) => x.id.localeCompare(y.id))
  return { chapters, home }
}

/** Odkazy na starou jedinou kapitolu úvodu se přesměrují do kapitol, kam oddíly přešly. */
export function rewriteIntroLinks(json, home, firstChapter) {
  return json.replace(/chapter:01-uvod(?:#([^)"\s]+))?/g, (_, anchor) => {
    const h = anchor && home[anchor]
    if (!h) return `chapter:${firstChapter}`
    return h.top ? `chapter:${h.chapter}` : `chapter:${h.chapter}#${anchor}`
  })
}

/** Bestiář: `pages` = { '01-uvod': html, '02-lide': html, … }. */
export function buildBestiarPack(pages) {
  const ID = 'drd2-bestiar-2'
  const problems = []
  const fixed = (n) => HTML_FIXES.reduce((h, [a, b]) => h.split(a).join(b), pages[n])
  const creatures = Object.keys(KINDS).flatMap((f) => parseCreatures(fixed(f), f, ID))
  const ids = new Set()
  for (const c of creatures) {
    if (ids.has(c.id)) problems.push(`Duplicitní ID bytosti: ${c.id}`)
    ids.add(c.id)
  }
  const { chapters, home } = bestiarChapters(fixed, problems)
  const pack = {
    manifest: {
      format: 1,
      id: ID,
      name: 'Dračí doupě 2 – Bestiář (SRD)',
      version: '2.0.0',
      build: PACK_BUILD,
      source: { book: 'Dračí doupě 2: Bestiář (SRD, drd2srd.d20.cz)', edition: '2' },
    },
    chapters,
    professions: [],
    creatureKinds: Object.values(KINDS),
    creatures,
  }
  // odkazy na starou jedinou kapitolu úvodu se přesměrují na kapitoly, do kterých oddíly přešly
  const json = rewriteIntroLinks(JSON.stringify(pack, null, 1), home, chapters[0].id)
  return { json, problems, pack: JSON.parse(json), id: ID }
}
