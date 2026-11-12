// Sestavení balíčků ze stránek SRD jako čisté funkce nad řetězci HTML (bez souborů a bez `sharp`), aby je mohl
// použít jak Node nástroj (`build.mjs`, `build-bestiar.mjs`), tak bookmarklet běžící na stránce SRD v prohlížeči.
// Texty SRD tak nikdy neopouštějí zařízení uživatele.
import { parseProfessions } from './parse-povolani.mjs'
import { parseChapter } from './parse-chapter.mjs'
import { KINDS, parseCreatures } from './parse-bestiar.mjs'
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

export const basename = (p) => p.split(/[\/]/).pop().split(/[?#]/)[0]

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

/** Základní příručka: `pages` = { '25-zakladni-povolani': html, … }. Obrázky se doplní až `embedImagesWith`. */
export function buildRulesChapters(pages) {
  const names = Object.keys(pages).sort()
  const professions = [
    ...parseProfessions(pages['25-zakladni-povolani'], 'zakladni'),
    ...parseProfessions(pages['26-pokrocila-povolani'], 'pokrocile'),
  ]
  const chapters = names.map((n) => parseChapter(pages[n], n))
  return { professions, chapters }
}

/** Dokončí balíček pravidel (po vložení obrázků do `chapters`). Vrací { json, problems }. */
export function finishRulesPack({ professions, chapters }) {
  const problems = []
  const requirements = deriveRequirements(chapters, professions)
  for (const p of professions) if (requirements.has(p.id)) p.requires = requirements.get(p.id)
  const { races, common } = deriveRaces(chapters)
  const pack = {
    manifest: {
      format: 1,
      id: 'drd2-pravidla-2',
      name: 'Dračí doupě 2 – Pravidla (SRD)',
      version: '2.0.0',
      source: { book: 'Dračí doupě 2: Pravidla (SRD, drd2srd.d20.cz)', edition: '2' },
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
  const pack = {
    manifest: {
      format: 1,
      id: ID,
      name: 'Dračí doupě 2 – Bestiář (SRD)',
      version: '2.0.0',
      source: { book: 'Dračí doupě 2: Bestiář (SRD, drd2srd.d20.cz)', edition: '2' },
    },
    // úvod vysvětluje zvláštní schopnosti bytostí, na které karty odkazují
    chapters: [parseChapter(fixed('01-uvod'), '01-uvod')],
    professions: [],
    creatureKinds: Object.values(KINDS),
    creatures,
  }
  return { json: JSON.stringify(pack, null, 1), problems, pack, id: ID }
}
