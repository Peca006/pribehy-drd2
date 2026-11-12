// Odvození strukturovaných dat (rasy, povahové rysy, výbava, pojmy) z již převedených kapitol SRD.
// Pracuje nad bloky kapitol (viz schema.ts), proto jde testovat na vymyšlených datech.
import { parseTitle } from './parse-povolani.mjs'
import { slug } from './html-md.mjs'

const chapterOf = (chapters, prefix) => chapters.find((c) => c.id.startsWith(prefix))
const plainHeading = (h) => h.text.replace(/\*/g, '').trim()
const NAMES_RE = /^\*\*([^*]+?):\*\*\s*(.+)$/
const isFlavor = (b) => b.type === 'p' && /^\*\*\*[^]*\*\*\*$/.test(b.text.trim())

function blockText(b) {
  if (b.type === 'p') return b.text
  if (b.type === 'list') return b.items.map((i) => `- ${i.text}`).join('\n')
  return ''
}
const joinText = (blocks) => blocks.map(blockText).filter(Boolean).join('\n\n')

function abilityFrom(prefix, h, blocks) {
  const t = parseTitle(plainHeading(h))
  const a = { id: `${prefix}/${slug(t.name)}`, name: t.name }
  for (const k of ['attribute', 'attributeNote', 'quickPickLevel', 'quickPickCulture'])
    if (t[k] !== undefined) a[k] = t[k]
  const rest = [...blocks]
  if (rest[0] && isFlavor(rest[0])) a.flavor = rest.shift().text
  a.text = joinText(rest)
  return a
}

/** Rozdělí bloky na části podle nadpisů dané úrovně ([nadpis, bloky pod ním]); vyšší nadpis část ukončí. */
function sections(blocks, level) {
  const out = []
  let cur
  for (const b of blocks) {
    if (b.type === 'heading' && b.level === level) out.push((cur = [b, []]))
    else if (b.type === 'heading' && b.level < level) cur = undefined
    else if (cur) cur[1].push(b)
  }
  return out
}

/** Rasy z kapitoly „Rasy“ (+ společné schopnosti), stručné přehledy z kapitoly o tvorbě hrdiny. */
export function deriveRaces(chapters) {
  const ch = chapterOf(chapters, '24')
  if (!ch) return { races: [], common: [] }

  const overviews = {}
  const create = chapterOf(chapters, '23')
  const raceSection = create && sections(create.blocks, 2).find(([h]) => plainHeading(h) === 'Rasa')
  if (raceSection) {
    let name
    for (const b of raceSection[1]) {
      if (b.type === 'heading' && b.level === 3) name = plainHeading(b)
      else if (name && b.type === 'p')
        overviews[name] ??= b.text.replace(
          /\s*Jejich popis najdete na straně (?:\[\d+\]\([^)]*\)|\d+)\./,
          '',
        )
    }
  }

  const firstRace = ch.blocks.findIndex((b) => b.type === 'heading' && b.level === 2)
  const lead = ch.blocks.slice(0, firstRace < 0 ? ch.blocks.length : firstRace)
  const hi = lead.findIndex((b) => b.type === 'heading' && b.level === 4)
  const common = hi >= 0 ? [abilityFrom('schopnost:rasa', lead[hi], lead.slice(hi + 1))] : []

  const races = sections(ch.blocks, 2)
    .filter(([h]) => !/^Rasy a kultury/.test(plainHeading(h)))
    .map(([h, blocks]) => {
      const name = plainHeading(h)
      const key = slug(name)
      const race = {
        id: `rasa:${key}`,
        name,
        summary: overviews[name],
        text: '',
        names: [],
        cultures: [],
        abilities: [],
      }
      const firstH = blocks.findIndex((b) => b.type === 'heading')
      const texts = []
      for (const b of blocks.slice(0, firstH < 0 ? blocks.length : firstH)) {
        const m = b.type === 'p' && b.text.match(NAMES_RE)
        if (m)
          race.names.push({
            label: m[1],
            list: m[2]
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          })
        else if (isFlavor(b) && !race.tagline) race.tagline = b.text
        else if (b.type === 'p' && /jména jsou:\s*$/.test(b.text)) continue
        else texts.push(b)
      }
      race.text = joinText(texts)
      for (const [h3, sub] of sections(blocks, 3)) {
        const t = plainHeading(h3)
        if (t === 'Zvláštní schopnosti') {
          race.abilities = sections(sub, 4).map(([h4, b4]) =>
            abilityFrom(`schopnost:${key}`, h4, b4),
          )
        } else {
          const ct = parseTitle(t)
          const culture = {
            id: `kultura:${key}/${slug(ct.name)}`,
            name: ct.name,
            text: joinText(sub),
          }
          const alias = t.match(/\(([^)]+)\)\s*$/)
          if (alias) culture.alias = alias[1]
          race.cultures.push(culture)
        }
      }
      return race
    })
  return { races, common }
}

/** Povahové rysy z kapitoly o tvorbě hrdiny. */
export function deriveTraits(chapters) {
  const ch = chapterOf(chapters, '23')
  const sec = ch && sections(ch.blocks, 2).find(([h]) => plainHeading(h) === 'Povahový rys')
  if (!sec) return []
  return sections(sec[1], 3).map(([h, blocks]) => {
    const name = plainHeading(h)
    const t = { id: `rys:${slug(name)}`, name }
    const rest = [...blocks]
    if (rest[0] && isFlavor(rest[0])) t.flavor = rest.shift().text
    t.text = joinText(rest)
    return t
  })
}

const UNIT = { haléř: 1, groš: 10, dukát: 100 }

/** „20–60 grošů“, „1.320–1.620 grošů“, „2 000 grošů“, „5 haléřů“ → rozpětí v haléřích. */
export function parsePrice(text) {
  const plain = text.replace(/[*]/g, '').trim()
  const m = plain.match(/^([\d.\s ]+?)(?:\s*[–-]\s*([\d.\s ]+?))?\s*(haléř|groš|dukát)/i)
  const price = { text: plain }
  if (!m) return price
  const num = (s) => Number(s.replace(/[.\s ]/g, ''))
  const unit = UNIT[m[3].toLowerCase()]
  price.min = num(m[1]) * unit
  if (m[2]) price.max = num(m[2]) * unit
  return price
}

/** Ceník vybavení z kapitoly „Vybavení“ (tabulky pod nadpisy úrovně 3). */
export function deriveEquipment(chapters) {
  const ch = chapterOf(chapters, '33')
  const sec = ch && sections(ch.blocks, 2).find(([h]) => plainHeading(h) === 'Ceník vybavení')
  if (!sec) return []
  return sections(sec[1], 3)
    .map(([h, blocks]) => {
      const name = plainHeading(h)
      const gid = `vybaveni:${slug(name)}`
      const table = blocks.find((b) => b.type === 'table')
      if (!table) return undefined
      return {
        id: gid,
        name,
        items: table.rows.map(([item, price]) => ({
          id: `${gid}/${slug(item.replace(/\([^)]*\)/g, ''))}`,
          name: item,
          price: parsePrice(price),
        })),
      }
    })
    .filter(Boolean)
}

/** Rychlé volby počáteční výbavy („Drahá“, „Ceněná“, „Obyčejná“). */
export function deriveStartingKits(chapters) {
  const ch = chapterOf(chapters, '23')
  const sec =
    ch && sections(ch.blocks, 3).find(([h]) => plainHeading(h) === 'Rychlá volba počáteční výbavy')
  if (!sec) return []
  return sections(sec[1], 4).map(([h, blocks]) => {
    const name = plainHeading(h).replace(/:$/, '')
    const list = blocks.find((b) => b.type === 'list')
    const lines = (list?.items ?? []).map((i) => {
      const m = i.text.match(/^\*\*([^*]+?):\*\*\s*([^]*)$/)
      return m ? { label: m[1], text: m[2].trim() } : { label: '', text: i.text }
    })
    const kit = { id: `vybava:${slug(name)}`, name, lines }
    const cash = lines.find((l) => l.label === 'Hotovost')?.text.match(/\((\d+)\)\s*\*?gro/)
    if (cash) kit.cash = Number(cash[1]) * 10
    return kit
  })
}

/** Počátek rejstříku pojmů: manévry ze základních pravidel. */
export function deriveTerms(chapters) {
  const ch = chapterOf(chapters, '31')
  const man = ch && sections(ch.blocks, 2).find(([h]) => plainHeading(h) === 'Manévry')
  if (!man) return []
  const target = (h) => `chapter:${ch.id}#${h.id}`
  const terms = [
    {
      id: 'pojem:zakladni-manevry',
      name: 'základní manévry',
      aliases: ['základní manévr'],
      target: target(man[0]),
      summary: 'Trojice manévrů přesně, mocně a lstivě, které ovlivňují samotné vyhodnocení akce.',
    },
  ]
  for (const [h, blocks] of sections(man[1], 3)) {
    const name = plainHeading(h)
    if (/^Manévry /.test(name)) continue // „Manévry se nesčítají“ apod. nejsou pojmy
    const summary = blocks.find((b) => b.type === 'p')?.text.split(/(?<=\.)\s/)[0]
    terms.push({ id: `pojem:${slug(name)}`, name: name.toLowerCase(), target: target(h), summary })
  }
  return terms
}

/** Číselné parametry tvorby postavy – pevně dané tvrzeními kapitoly o tvorbě hrdiny. */
export const CREATION_RULES = {
  startingLevels: 3,
  attributePoints: 15,
  attributeMin: 1,
  attributeRecommendedMin: 3,
  raceAbilities: 1,
  abilitiesPerLevel: 1,
  purchaseBudget: 900,
}

/** Hrubý kmen českého slova: prvních 4 písmen (sjednotí „manévr/manévry/manévru“, „ohrožení/ohrožením“). */
export const stemOf = (w) => w.toLowerCase().slice(0, 4)

function collectTexts(pack) {
  const out = []
  const note = (t) => t && out.push(t)
  const walk = (bs) => {
    for (const b of bs ?? []) {
      note(b.text)
      if (b.items)
        (function w(i) {
          i.forEach((x) => (note(x.text), x.items && w(x.items)))
        })(b.items)
      if (b.rows) b.rows.flat().forEach(note)
      walk(b.blocks)
    }
  }
  for (const c of pack.chapters) walk(c.blocks)
  for (const p of pack.professions) {
    note(p.intro)
    p.abilities.forEach((a) => (note(a.text), note(a.flavor)))
  }
  for (const r of pack.races ?? []) r.abilities.forEach((a) => note(a.text))
  return out
}

/**
 * Slovník pojmů: pojmy jsou v textu sázené ***tučnou kurzívou***. Pojem dostane vysvětlení, pokud
 * existuje nadpis (v kapitolách o pravidlech), jehož slovo má stejný kmen jako některý častý pojem;
 * všechny tvary pojmu z textu se stanou aliasy. `known` jsou už hotové pojmy (např. manévry).
 */
/**
 * Pojmy, které SRD vysvětluje v nadpisu s jiným názvem nebo jen v textu (Vlastnosti, hod kostkami, …),
 * takže je z nadpisů odvodit nelze. `prefixes` určují, které tvary ze sazby ***…*** jsou aliasy.
 */
export const EXTRA_TERMS = [
  { name: 'tělo', prefixes: ['těl'], chapter: '31', heading: 'vlastnosti' },
  { name: 'duše', prefixes: ['duš'], chapter: '31', heading: 'vlastnosti' },
  { name: 'vliv', prefixes: ['vliv'], chapter: '31', heading: 'vlastnosti' },
  { name: 'hod', prefixes: ['hod'], chapter: '31', heading: 'hod-kostkami' },
  { name: 'peníze', prefixes: ['peníz', 'peněz', 'penězi'], chapter: '31', heading: 'penize-a-suroviny' },
  { name: 'přístup', prefixes: ['přístup'], chapter: '31', heading: 'pristupy-k-iniciative' },
  { name: 'náročnost', prefixes: ['náročn'], chapter: '31', heading: 'kdy-hazet-kostkami' },
  { name: 'aktivace', prefixes: ['aktivac'], chapter: '35', heading: 'cena' },
  { name: 'příhoda', prefixes: ['příhod'], chapter: '41', heading: 'dobrodruzstvi-vypravy-a-prihody' },
]

function addExtraTerms(pack, terms, frequent, taken) {
  for (const x of EXTRA_TERMS) {
    const ch = pack.chapters.find((c) => c.id.startsWith(x.chapter))
    const i = ch?.blocks.findIndex((b) => b.type === 'heading' && b.id === x.heading) ?? -1
    if (i < 0) throw new Error(`Pojem „${x.name}“: v kapitole ${x.chapter} chybí nadpis ${x.heading}`)
    const aliases = frequent.filter(
      (f) => !f.includes(' ') && f !== x.name && x.prefixes.some((p) => f.startsWith(p)) && !taken.has(f),
    )
    const summary = ch.blocks
      .slice(i + 1)
      .find((b) => b.type === 'p')
      ?.text.split(/(?<=\.)\s/)[0]
    terms.push({
      id: `pojem:${slug(x.name)}`,
      name: x.name,
      aliases,
      target: `chapter:${ch.id}#${x.heading}`,
      ...(summary ? { summary } : {}),
    })
    for (const n of [x.name, ...aliases]) taken.add(n)
  }
}

export function deriveGlossary(pack, known = []) {
  const forms = new Map() // tvar → počet
  for (const t of collectTexts(pack))
    for (const m of t.matchAll(/\*\*\*([^*]+?)\*\*\*/g)) {
      const k = m[1].trim().toLowerCase()
      forms.set(k, (forms.get(k) ?? 0) + 1)
    }
  const frequent = [...forms].filter(([, n]) => n >= 3).map(([k]) => k)
  const taken = new Set(known.flatMap((t) => [t.name, ...(t.aliases ?? [])]))
  const terms = [...known]
  const add = (word, ch, h) => {
    const id = `pojem:${slug(word)}`
    if (terms.some((t) => t.id === id)) return
    const stem = stemOf(word)
    const aliases = frequent.filter((f) => !f.includes(' ') && stemOf(f) === stem && !taken.has(f))
    if (!aliases.length && !forms.has(word)) return
    const summary = ch.blocks
      .slice(ch.blocks.indexOf(h) + 1)
      .find((b) => b.type === 'p')
      ?.text.split(/(?<=\.)\s/)[0]
    const t = {
      id,
      name: word,
      aliases: [...new Set([word, ...aliases])].filter((a) => a !== word),
      target: `chapter:${ch.id}#${h.id}`,
      ...(summary ? { summary } : {}),
    }
    for (const n of [t.name, ...t.aliases]) taken.add(n)
    terms.push(t)
  }
  const chapters = pack.chapters.filter((c) => /^3[1-7]/.test(c.id))
  const headings = chapters.flatMap((ch) =>
    ch.blocks.filter((b) => b.type === 'heading').map((h) => [ch, h, plainHeading(h)]),
  )
  // 1. průchod: nadpis je přímo jeden pojem („Výhoda“, „Sudba“)
  for (const [ch, h, title] of headings) {
    const word = title
      .replace(/\(.*\)/, '')
      .trim()
      .toLowerCase()
    if (word && !word.includes(' ')) add(word, ch, h)
  }
  // 2. průchod: pojem se vyskytuje ve víceslovném nadpisu („Výsledek hodu, Ohrožení a vyčerpání“)
  for (const [ch, h, title] of headings)
    for (const w of title
      .toLowerCase()
      .split(/[^\p{L}]+/u)
      .filter((x) => x.length >= 4)) {
      const hit = frequent.find((f) => !f.includes(' ') && stemOf(f) === stemOf(w))
      const total = [...forms]
        .filter(([f]) => stemOf(f) === stemOf(w))
        .reduce((n, [, c]) => n + c, 0)
      if (hit && total >= 40 && !taken.has(w) && !terms.some((t) => stemOf(t.name) === stemOf(w)))
        add(w, ch, h)
    }
  addExtraTerms(pack, terms, frequent, taken)
  return terms
}
