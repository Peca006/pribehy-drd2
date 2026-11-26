// Převod obsahových balíčků SRD (Příručka + Bestiář) na jednu elektronickou knihu ePub 3 (čisté funkce bez souborů;
// soubory, obrázky a zipování řeší `build.mjs`). Vnitřní odkazy `chapter:ID#kotva` se mění na odkazy mezi
// soubory knihy, na konci knihy je několik rejstříků (pojmy, bytosti, povolání a schopnosti, rasy, výbava).
// Texty knihy jdou jen do souboru pro soukromé použití; nástroj sám žádné texty neobsahuje.
import { booksOf } from '../../src/core/books.ts'
import { cleanForm, groupForms } from './forms.mjs'
import { NO_LINK, parseInline } from '../../src/core/markdown.ts'

const enc = new TextEncoder()

/** Krátké názvy knih do popisků odkazů v rejstřících. */
const SHORT = { 'drd2-pravidla-2': 'Příručka', 'drd2-bestiar-2': 'Bestiář' }
/** Nejvýše tolik míst u jednoho pojmu v pojmovém rejstříku (pojem se v textu opakuje stovkykrát). */
export const MAX_PLACES = 8
/** Pojem ze sazby ***…*** delší než toto nebo s větnou interpunkcí je spíš ukázka z příběhu, ne pojem. */
const MAX_TERM_LENGTH = 40

export const slug = (s) =>
  s
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Text bez značek mini-markdownu a odkazů. */
export const plain = (md) =>
  md
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(new RegExp(`[*${NO_LINK}]`, 'g'), '')
    .replace(/\s+/g, ' ')
    .trim()

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const letterOf = (name) =>
  /^ch/i.test(name) ? 'Ch' : /^[0-9]/.test(name) ? '#' : name.charAt(0).toUpperCase()

/** Projde bloky (i vnořené) v pořadí textu; ke každému bloku řekne nejbližší předchozí nadpis. */
function* walk(blocks, state = { heading: null }) {
  for (const b of blocks) {
    if (b.type === 'heading') state.heading = b
    yield [b, state.heading]
    if (b.blocks) yield* walk(b.blocks, state)
  }
}

/** Všechny řetězce mini-markdownu v bloku (bez vnořených bloků). */
function* textsOf(b) {
  if (b.type === 'p') yield b.text
  else if (b.type === 'list') {
    const rec = function* (items) {
      for (const i of items) {
        yield i.text
        if (i.items) yield* rec(i.items)
      }
    }
    yield* rec(b.items)
  } else if (b.type === 'table') for (const r of b.rows) yield* r
}

function* termNodes(nodes) {
  for (const n of nodes) {
    if (n.t === 'term') yield n
    if (n.c) yield* termNodes(n.c)
  }
}
const textOf = (nodes) => nodes.map((n) => (n.t === 'text' ? n.v : textOf(n.c))).join('')

// ---------------------------------------------------------------------------------------------------------------
// XHTML

/** Vykreslí odstavec(e) mini-markdownu. */
function inline(nodes, ctx) {
  return nodes
    .map((n) => {
      switch (n.t) {
        case 'text':
          return esc(n.v)
        case 'em':
          return `<em>${inline(n.c, ctx)}</em>`
        case 'strong':
          return `<strong>${inline(n.c, ctx)}</strong>`
        case 'term':
          return `<strong><em>${inline(n.c, ctx)}</em></strong>`
        case 'link': {
          const href = ctx.href(n.href)
          return href ? `<a href="${esc(href)}">${inline(n.c, ctx)}</a>` : inline(n.c, ctx)
        }
        default:
          return ''
      }
    })
    .join('')
}

function md(text, ctx) {
  return text
    .split('\n\n')
    .filter(Boolean)
    .map((para) =>
      para.startsWith('- ')
        ? `<ul>${para
            .split('\n')
            .map((l) => `<li>${inline(parseInline(l.replace(/^- /, '')), ctx)}</li>`)
            .join('')}</ul>`
        : `<p>${inline(parseInline(para), ctx)}</p>`,
    )
    .join('\n')
}

const items = (list, ctx) =>
  `<ul>${list
    .map((i) => `<li>${inline(parseInline(i.text), ctx)}${i.items ? items(i.items, ctx) : ''}</li>`)
    .join('')}</ul>`

function blocks(list, ctx) {
  return list
    .map((b) => {
      switch (b.type) {
        case 'heading':
          return `<h${b.level} id="${esc(b.id)}">${esc(b.text)}</h${b.level}>`
        case 'p':
          return md(b.text, ctx)
        case 'list':
          return items(b.items, ctx)
        case 'quote':
          return `<blockquote>${blocks(b.blocks, ctx)}</blockquote>`
        case 'card':
          return `<div class="card"><p class="card-title">${esc(b.title)}</p>${blocks(b.blocks, ctx)}</div>`
        case 'table': {
          const al = (i) =>
            b.align[i] && b.align[i] !== 'left' ? ` style="text-align:${b.align[i]}"` : ''
          const head = b.header.length
            ? `<thead><tr>${b.header.map((h, i) => `<th${al(i)}>${esc(plain(h))}</th>`).join('')}</tr></thead>`
            : ''
          const rows = b.rows
            .map(
              (r) =>
                `<tr>${r.map((c, i) => `<td${al(i)}>${inline(parseInline(c), ctx)}</td>`).join('')}</tr>`,
            )
            .join('')
          return `<table>${head}<tbody>${rows}</tbody></table>`
        }
        case 'image': {
          const img = ctx.images.get(b.src)
          if (!img) {
            ctx.warn(`chybí obrázek ${b.src}`)
            return ''
          }
          return `<p class="img"><img src="../${esc(img.path)}" alt="${esc(b.alt)}"/></p>`
        }
        case 'rule':
          return '<hr/>'
        default:
          return ''
      }
    })
    .join('\n')
}

const PAGE_HEAD = (title) =>
  `<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="cs" xml:lang="cs">\n<head><meta charset="utf-8"/><title>${esc(title)}</title><link rel="stylesheet" type="text/css" href="../style.css"/></head>\n<body>\n`
const PAGE_FOOT = '\n</body>\n</html>\n'
const page = (title, body) => PAGE_HEAD(title) + body + PAGE_FOOT

/** Karta bytosti z Bestiáře (řádky karty, popis, oddíly); kotvy `bytost-…`. */
function creatureHtml(c, anchor, ctx, kindName) {
  const base = c.variantOf ? ctx.creatureAnchor.get(c.variantOf) : undefined
  const baseName = c.variantOf ? ctx.creatureName.get(c.variantOf) : undefined
  const rows = c.stats
    .map(
      (s) =>
        `<p class="stat"><strong>${esc(s.label)}:</strong> ${inline(parseInline(s.value), ctx)}</p>`,
    )
    .join('\n')
  const sections = (c.sections ?? [])
    .map((s) => `<h3 id="${anchor}-${esc(s.id)}">${esc(s.title)}</h3>\n${md(s.text, ctx)}`)
    .join('\n')
  const variant = base
    ? `<p class="muted">Varianta bytosti <a href="${esc(base)}">${esc(baseName)}</a>.</p>\n`
    : ''
  return `<h2 id="${anchor}">${esc(c.name)}</h2>\n<p class="muted">${esc(kindName)}</p>\n${variant}<div class="card stats">\n${rows}\n</div>\n${md(c.description ?? '', ctx)}\n${sections}`
}

// ---------------------------------------------------------------------------------------------------------------
// Rejstříky

class IndexBuilder {
  constructor() {
    /** @type {Map<string, {name: string, summary?: string, locs: Map<string, any>}>} */
    this.entries = new Map()
  }
  /** `loc`: `{ href, label, pos, score }`; stejné místo se sčítá. */
  add(key, name, loc, summary) {
    let e = this.entries.get(key)
    if (!e) this.entries.set(key, (e = { name, summary, locs: new Map() }))
    if (summary && !e.summary) e.summary = summary
    const l = e.locs.get(loc.href)
    if (l) {
      l.n += loc.n ?? 1
      l.score += loc.score ?? 0
    } else e.locs.set(loc.href, { ...loc, n: loc.n ?? 1, score: loc.score ?? 0 })
  }
  /** Seřazená hesla; u každého hlavní místo (nejvyšší skóre) a další v pořadí knihy. */
  result(max = Infinity) {
    return [...this.entries.values()]
      .map((e) => {
        const all = [...e.locs.values()].sort(
          (a, b) => b.score + b.n - (a.score + a.n) || a.pos - b.pos,
        )
        const shown = all.slice(0, max)
        const [main, ...rest] = shown
        rest.sort((a, b) => a.pos - b.pos)
        return {
          name: e.name,
          summary: e.summary,
          locs: [main, ...rest],
          more: all.length - shown.length,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'cs'))
  }
}

function indexHtml(title, intro, entries) {
  const groups = []
  for (const e of entries) {
    const l = letterOf(e.name)
    const g = groups.find((x) => x.letter === l)
    if (g) g.entries.push(e)
    else groups.push({ letter: l, entries: [e] })
  }
  const nav = groups
    .map((g) => `<a href="#l-${esc(slug(g.letter) || 'x')}">${esc(g.letter)}</a>`)
    .join(' ')
  const body = groups
    .map(
      (g) =>
        `<h2 id="l-${esc(slug(g.letter) || 'x')}">${esc(g.letter)}</h2>\n` +
        g.entries
          .map((e) => {
            const places = e.locs
              .map(
                (l, i) =>
                  `<a href="${esc(l.href)}">${i === 0 ? '<strong>' : ''}${esc(l.label)}${i === 0 ? '</strong>' : ''}</a>`,
              )
              .join('; ')
            const more = e.more > 0 ? ` <span class="muted">(a dalších ${e.more} míst)</span>` : ''
            const sum = e.summary ? ` <span class="sum">– ${esc(plain(e.summary))}</span>` : ''
            return `<p class="ix"><strong>${esc(e.name)}</strong>${sum}<br/>${places}${more}</p>`
          })
          .join('\n'),
    )
    .join('\n')
  return page(
    title,
    `<h1>${esc(title)}</h1>\n<p class="intro">${esc(intro)}</p>\n<p class="letters">${nav}</p>\n${body}`,
  )
}

// ---------------------------------------------------------------------------------------------------------------
// Celá kniha

/**
 * @param {object} opts
 * @param {import('../../src/core/content/schema').ContentPack[]} opts.packs balíčky SRD (Příručka, Bestiář)
 * @param {Map<string, {path: string, type: string, data: Uint8Array}>} opts.images obrázky podle `src` z balíčku
 * @param {string} opts.date ISO čas sestavení (dcterms:modified)
 * @param {string} [opts.id] identifikátor knihy
 */
export function buildEpub({
  packs,
  images,
  date,
  id = 'urn:uuid:5b1c2f6e-4d0a-4f3a-9a58-6a2d0f1e7c11',
}) {
  const books = booksOf(packs)
  const warnings = []
  const warn = (m) => {
    if (!warnings.includes(m)) warnings.push(m)
  }
  const chapters = books.flatMap((b) => b.chapters.map((c) => ({ ...c, book: b })))
  const bookShort = (b) => SHORT[b.id] ?? b.name
  const file = (cid) => `text/${cid}.xhtml`

  // pořadí míst v knize (kvůli řazení odkazů v rejstřících) a popisky
  const pos = new Map()
  const creatureAnchor = new Map() // ID bytosti -> odkaz z kapitoly (relativní k text/)
  const creatureName = new Map()
  const creatureAt = new Map() // ID bytosti -> { chapter, anchor }
  let counter = 0
  for (const ch of chapters) {
    pos.set(file(ch.id), counter++)
    for (const [b] of walk(ch.blocks))
      if (b.type === 'heading') pos.set(`${file(ch.id)}#${b.id}`, counter++)
    const pack = packs.find((p) => p.manifest.id === ch.book.id)
    if (ch.kind && pack?.creatures) {
      const used = new Set()
      for (const c of pack.creatures.filter((c) => c.kind === ch.kind)) {
        let a = `bytost-${slug(c.name)}`
        for (let i = 2; used.has(a); i++) a = `bytost-${slug(c.name)}-${i}`
        used.add(a)
        creatureAnchor.set(c.id, `${ch.id}.xhtml#${a}`)
        creatureName.set(c.id, c.name)
        creatureAt.set(c.id, { chapter: ch, anchor: a, creature: c })
        pos.set(`${file(ch.id)}#${a}`, counter++)
      }
    }
  }
  const hrefPos = (href) => pos.get(href) ?? pos.get(href.split('#')[0]) ?? 1e9
  const labelOf = (ch, heading) =>
    `${bookShort(ch.book)}: ${ch.title}${heading && heading.text !== ch.title ? ` › ${heading.text}` : ''}`
  /** Místo v knize: kapitola (+ nadpis podle ID) -> `{ href, label, pos }`. */
  const place = (ch, heading, score = 0) => {
    const href = heading ? `${file(ch.id)}#${heading.id}` : file(ch.id)
    return { href: '../' + href, label: labelOf(ch, heading), pos: hrefPos(href), score }
  }
  const chapterById = new Map(chapters.map((c) => [c.id, c]))
  const headingsOfChapter = (ch) =>
    [...walk(ch.blocks)].map(([b]) => b).filter((b) => b.type === 'heading')

  const ctx = {
    images,
    warn,
    creatureAnchor,
    creatureName,
    /** `chapter:ID#kotva` -> relativní odkaz v rámci složky `text/` */
    href(h) {
      const m = /^chapter:([^#]+)(?:#(.+))?$/.exec(h)
      if (!m) return undefined
      const ch = chapterById.get(m[1])
      if (!ch) return warn(`odkaz na neznámou kapitolu: ${h}`)
      if (m[2] && !pos.has(`${file(ch.id)}#${m[2]}`)) {
        warn(`odkaz na neznámou kotvu: ${h}`)
        return `${ch.id}.xhtml`
      }
      return `${ch.id}.xhtml${m[2] ? '#' + m[2] : ''}`
    },
  }

  // --- kapitoly
  const out = []
  const kindNames = new Map(
    packs.flatMap((p) => (p.creatureKinds ?? []).map((k) => [k.id, k.name])),
  )
  const chapterNav = new Map()
  for (const ch of chapters) {
    let body = `<h1 id="top">${esc(ch.title)}</h1>\n${blocks(ch.blocks, ctx)}`
    const sub = headingsOfChapter(ch)
      .filter((h) => h.level === 2)
      .map((h) => ({ title: h.text, href: `${file(ch.id)}#${h.id}` }))
    if (ch.kind) {
      for (const { chapter, anchor, creature } of creatureAt.values()) {
        if (chapter.id !== ch.id) continue
        body += `\n${creatureHtml(creature, anchor, ctx, kindNames.get(creature.kind) ?? creature.kind)}`
        sub.push({ title: creature.name, href: `${file(ch.id)}#${anchor}` })
      }
    }
    chapterNav.set(ch.id, sub)
    out.push({
      name: `OEBPS/${file(ch.id)}`,
      data: page(ch.title, `<section epub:type="chapter">\n${body}\n</section>`),
    })
  }

  // --- rejstřík pojmů: ***pojem*** v textu (a ruční seznam pojmů s vysvětlením z balíčku)
  const terms = packs.flatMap((p) => p.terms ?? [])
  const resolveTarget = (target) => {
    const m = /^chapter:([^#]+)(?:#(.+))?$/.exec(target)
    const ch = m && chapterById.get(m[1])
    if (!ch) return undefined
    const heading = m[2] ? headingsOfChapter(ch).find((h) => h.id === m[2]) : undefined
    return place(ch, heading, 1000)
  }
  /** Výskyty pojmů v textu: upravený tvar, místo a nejbližší nadpis; tvary se pak sloučí (`forms.mjs`). */
  const occurrences = []
  const noteTerm = (text, ch, heading, loc) => {
    for (const n of termNodes(parseInline(text))) {
      const raw = plain(textOf(n.c))
      if (!raw || raw.length > MAX_TERM_LENGTH || /[.!?"„“]/.test(raw)) continue
      const form = cleanForm(raw)
      if (form) occurrences.push({ form, place: loc ?? place(ch, heading), heading })
    }
  }
  for (const ch of chapters) {
    for (const [b, heading] of walk(ch.blocks)) for (const t of textsOf(b)) noteTerm(t, ch, heading)
  }
  for (const { chapter, anchor, creature } of creatureAt.values()) {
    const loc = {
      href: `../${file(chapter.id)}#${anchor}`,
      label: `${bookShort(chapter.book)}: ${chapter.title} › ${creature.name}`,
      pos: hrefPos(`${file(chapter.id)}#${anchor}`),
      score: 0,
    }
    const texts = [
      ...creature.stats.map((s) => s.value),
      creature.description ?? '',
      ...(creature.sections ?? []).map((s) => s.text),
    ]
    for (const t of texts) noteTerm(t, chapter, null, loc)
  }
  const counts = new Map()
  for (const o of occurrences) counts.set(o.form, (counts.get(o.form) ?? 0) + 1)
  for (const t of terms)
    for (const n of [t.name, ...(t.aliases ?? [])]) {
      const form = cleanForm(n)
      if (form && !counts.has(form)) counts.set(form, 0)
    }
  // pojem a jeho aliasy z balíčku (`derive.mjs`, tytéž tvary, které používají odkazy v aplikaci) patří k sobě vždy
  const ties = terms.map((t) => [t.name, ...(t.aliases ?? [])].map(cleanForm).filter(Boolean))
  const formGroups = groupForms(counts, ties)
  const termIndex = new IndexBuilder()
  for (const o of occurrences) {
    const g = formGroups.get(o.form)
    const exact = o.heading && slug(o.heading.text) === slug(g.name) ? 500 : 0
    termIndex.add(g.key, cap(g.name), { ...o.place, score: exact })
  }
  for (const t of terms) {
    const loc = resolveTarget(t.target)
    const form = cleanForm(t.name)
    if (!loc) warn(`pojem „${t.name}“ vede na neexistující místo ${t.target}`)
    else if (form) {
      const g = formGroups.get(form)
      termIndex.add(g.key, cap(g.name), loc, t.summary)
    }
  }

  // --- pomocné hledání nadpisů podle názvu
  /** Nadpis v kapitolách `within` s ID rovným `slug(name)` nebo začínajícím jím; vrací `{ ch, heading, index }`. */
  const findHeading = (name, within, from = 0, to = Infinity) => {
    const s = slug(name)
    // přesná shoda ID (i s číslem na konci, např. `dovednosti-2`), teprve pak začátek ID (`nazev-telo-rychla-volba…`);
    // „Varianta: X“ v Příručce má ID `varianta-x`
    const passes = [
      (id) => id === s || new RegExp(`^${s}-\\d+$`).test(id),
      (id) => id === `varianta-${s}`,
      (id) => id.startsWith(s + '-'),
    ]
    for (const match of passes) {
      for (const ch of within) {
        const hs = headingsOfChapter(ch)
        for (let i = Math.max(from, 0); i < Math.min(hs.length, to); i++) {
          if (match(hs[i].id)) return { ch, heading: hs[i], index: i, hs }
        }
      }
    }
    return undefined
  }
  /** Rozsah nadpisů (index od, do) oddílu, který začíná nadpisem `index` (do dalšího nadpisu stejné nebo vyšší úrovně). */
  const sectionEnd = (hs, index) => {
    let e = index + 1
    while (e < hs.length && hs[e].level > hs[index].level) e++
    return e
  }
  const ofIds = (...ids) => ids.map((i) => chapterById.get(i)).filter(Boolean)
  const addFound = (ix, name, found, label) => {
    if (!found) return warn(`v textu se nenašlo místo pro heslo „${name}“`)
    ix.add(
      slug(name) + '|' + (label ?? ''),
      cap(name),
      { ...place(found.ch, found.heading), score: 0 },
      label,
    )
  }

  // --- bytosti
  const creatureIx = new IndexBuilder()
  for (const { chapter, anchor, creature } of creatureAt.values()) {
    const href = `${file(chapter.id)}#${anchor}`
    creatureIx.add(slug(creature.name), cap(creature.name), {
      href: '../' + href,
      label: `${bookShort(chapter.book)}: ${chapter.title}`,
      pos: hrefPos(href),
      score: 0,
    })
  }
  for (const p of packs) {
    // bytosti, které mají v knize jen text v kapitole (krátký Bestiář v Příručce): podle nadpisu kapitoly
    if (p.chapters?.some((c) => c.kind)) continue
    for (const c of p.creatures ?? []) {
      const found = findHeading(
        c.name,
        (p.chapters ?? []).filter((x) => /bestiar/.test(x.id)).map((x) => chapterById.get(x.id)),
      )
      if (found) creatureIx.add(slug(c.name), cap(c.name), place(found.ch, found.heading))
      else warn(`bytost „${c.name}“ (${p.manifest.id}) nemá v kapitole nadpis`)
    }
  }

  // --- povolání a schopnosti
  const rules = packs.find((p) => p.professions?.length)
  const profIx = new IndexBuilder()
  const profChapters = ofIds('25-zakladni-povolani', '26-pokrocila-povolani')
  for (const pr of rules?.professions ?? []) {
    const f = findHeading(pr.name, profChapters)
    if (!f) {
      warn(`povolání „${pr.name}“ nemá nadpis`)
      continue
    }
    profIx.add(slug(pr.name), cap(pr.name), place(f.ch, f.heading), undefined)
    const end = sectionEnd(f.hs, f.index)
    for (const a of pr.abilities ?? []) {
      const af = findHeading(a.name, [f.ch], f.index + 1, end)
      if (!af) {
        warn(`schopnost „${a.name}“ (${pr.name}) nemá nadpis`)
        continue
      }
      profIx.add(
        slug(a.name) + '|' + pr.id,
        cap(a.name),
        place(af.ch, af.heading),
        `schopnost povolání ${pr.name}`,
      )
    }
  }
  // --- rasy, kultury, rasové schopnosti a povahové rysy
  const raceIx = new IndexBuilder()
  const raceCh = ofIds('24-rasy')
  for (const r of rules?.races ?? []) {
    const f = findHeading(r.name, raceCh)
    if (!f) {
      warn(`rasa „${r.name}“ nemá nadpis`)
      continue
    }
    raceIx.add(slug(r.name), cap(r.name), place(f.ch, f.heading))
    const end = sectionEnd(f.hs, f.index)
    for (const c of r.cultures ?? []) {
      const cf =
        findHeading(c.alias || c.name, [f.ch], f.index + 1, end) ??
        findHeading(c.name, [f.ch], f.index + 1, end)
      if (cf)
        raceIx.add(
          slug(c.name) + '|' + r.id,
          cap(c.alias || c.name),
          place(cf.ch, cf.heading),
          `kultura (${r.name})`,
        )
      else warn(`kultura „${c.name}“ (${r.name}) nemá nadpis`)
    }
    for (const a of r.abilities ?? []) {
      const af = findHeading(a.name, [f.ch], f.index + 1, end)
      if (af)
        raceIx.add(
          slug(a.name) + '|' + r.id,
          cap(a.name),
          place(af.ch, af.heading),
          `rasová schopnost (${r.name})`,
        )
      else warn(`rasová schopnost „${a.name}“ (${r.name}) nemá nadpis`)
    }
  }
  for (const a of rules?.commonRaceAbilities ?? [])
    addFound(raceIx, a.name, findHeading(a.name, raceCh), 'schopnost každé rasy')
  for (const t of rules?.traits ?? [])
    addFound(raceIx, t.name, findHeading(t.name, ofIds('23-tvorba-hrdiny')), 'povahový rys')

  // --- výbava: předměty z ceníku (řádky tabulek kapitoly Vybavení) a kouzelné předměty (nadpisy na konci kapitoly)
  const gearIx = new IndexBuilder()
  const gearCh = chapterById.get('33-vybaveni')
  if (gearCh && rules?.equipment) {
    const rows = []
    for (const [b, heading] of walk(gearCh.blocks))
      if (b.type === 'table')
        for (const r of b.rows) rows.push({ key: slug(plain(r[0] ?? '')), heading })
    for (const g of rules.equipment) {
      for (const it of g.items) {
        const k = slug(plain(it.name))
        const hits = rows.filter((r) => r.key === k)
        if (!hits.length) warn(`předmět „${plain(it.name)}“ nenalezen v tabulkách Vybavení`)
        for (const h of hits) gearIx.add(k, cap(plain(it.name)), place(gearCh, h.heading))
      }
    }
    const hs = headingsOfChapter(gearCh)
    const start = hs.findIndex((h) => h.id === 'zvlastni-a-kouzelne-predmety-artefakty')
    if (start >= 0)
      for (const h of hs.slice(start + 1).filter((x) => x.level >= 3))
        gearIx.add(slug(h.text), cap(h.text), place(gearCh, h), undefined)
  }

  /** @type {any[][]} */ // [ID souboru, název, úvod, hesla]
  const idx = [
    [
      'rejstrik-pojmu',
      'Rejstřík pojmů',
      'Herní pojmy s odkazy na místa, kde se vysvětlují nebo hojně vyskytují (u častých pojmů jen nejdůležitější místa). Tučný odkaz je hlavní místo.',
      termIndex.result(MAX_PLACES),
    ],
    [
      'rejstrik-bytosti',
      'Rejstřík bytostí',
      'Bytosti z Bestiáře a z kapitoly Bestiář v Příručce.',
      creatureIx.result(),
    ],
    [
      'rejstrik-povolani',
      'Rejstřík povolání a schopností',
      'Povolání a jejich schopnosti.',
      profIx.result(),
    ],
    [
      'rejstrik-rasy',
      'Rejstřík ras, kultur a rysů',
      'Rasy, kultury, rasové schopnosti a povahové rysy.',
      raceIx.result(),
    ],
    [
      'rejstrik-vybava',
      'Rejstřík výbavy',
      'Zbraně, zbroje, výstroj, služby, zvířata, majetky a zvláštní předměty z kapitoly Vybavení.',
      gearIx.result(4),
    ],
  ].filter((x) => x[3].length)
  for (const [iid, title, intro, entries] of idx)
    out.push({ name: `OEBPS/text/${iid}.xhtml`, data: indexHtml(title, intro, entries) })

  // --- titulní strana a „O knize“
  const meta = packs.map((p) => `${p.manifest.name}, verze ${p.manifest.version}`)
  const front = page(
    'Titulní strana',
    `<section epub:type="titlepage">\n<h1 id="top">Dračí doupě II</h1>\n<p class="subtitle">Příručka a Bestiář (SRD)</p>\n<p>Elektronická kniha vytvořená nástrojem projektu Příběhy v Dračím doupěti z veřejného SRD Dračího doupěte II (drd2srd.d20.cz), které je zveřejněno se svolením nakladatelství Altar. Určeno pro osobní použití ve čtečce.</p>\n<ul>${meta.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>\n<p class="muted">Vnitřní odkazy vedou mezi kapitolami. Na konci knihy jsou rejstříky pojmů, bytostí, povolání a schopností, ras a výbavy.</p>\n</section>`,
  )
  out.unshift({ name: 'OEBPS/text/titulni-strana.xhtml', data: front })

  // --- navigace (obsah): části a kapitoly, u kapitol oddíly 2. úrovně
  const chapterNode = (ch) => ({
    title: ch.title,
    href: file(ch.id),
    children: chapterNav.get(ch.id).map((s) => ({ ...s, children: [] })),
  })
  /** @type {{ title: string, href?: string, children: any[] }[]} */
  const tree = [{ title: 'Titulní strana', href: 'text/titulni-strana.xhtml', children: [] }]
  for (const b of books) {
    const groups = b.groups.map((g) =>
      g.name ? { title: g.name, children: g.chapters.map(chapterNode) } : null,
    )
    const flat = b.groups.some((g) => g.name) ? groups.filter(Boolean) : b.chapters.map(chapterNode)
    // kapitoly bez části, které leží mezi pojmenovanými částmi, patří na konec
    const loose = b.groups.filter((g) => !g.name).flatMap((g) => g.chapters.map(chapterNode))
    tree.push({ title: bookShort(b), children: [...flat, ...loose] })
  }
  tree.push({
    title: 'Rejstříky',
    children: idx.map(([iid, title]) => ({ title, href: `text/${iid}.xhtml`, children: [] })),
  })

  const firstHref = (n) => n.href ?? firstHref(n.children[0])

  // --- stránka Obsah v textu knihy (za titulní stranou): části a kapitoly s odkazem na začátek kapitoly
  const tocList = (nodes) =>
    `<ul class="toc">${nodes
      .map((n) => {
        const href = esc(firstHref(n).replace(/^text\//, ''))
        // kapitola (má vlastní soubor) je odkaz; část knihy je nadpis a pod ní kapitoly
        const label = n.href
          ? `<a href="${href}">${esc(n.title)}</a>`
          : `<strong>${esc(n.title)}</strong>`
        const sub = n.href ? '' : tocList(n.children)
        return `<li>${label}${sub}</li>`
      })
      .join('')}</ul>`
  out.splice(1, 0, {
    name: 'OEBPS/text/obsah.xhtml',
    data: page(
      'Obsah',
      `<section epub:type="toc">\n<h1 id="top">Obsah</h1>\n${tocList(tree.slice(1))}\n</section>`,
    ),
  })
  tree.splice(1, 0, { title: 'Obsah', href: 'text/obsah.xhtml', children: [] })

  const navList = (nodes) =>
    `<ol>${nodes.map((n) => `<li>${n.href ? `<a href="${esc(n.href)}">${esc(n.title)}</a>` : `<a href="${esc(firstHref(n))}">${esc(n.title)}</a>`}${n.children.length ? navList(n.children) : ''}</li>`).join('')}</ol>`
  const nav = `<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="cs" xml:lang="cs">\n<head><meta charset="utf-8"/><title>Obsah</title><link rel="stylesheet" type="text/css" href="style.css"/></head>\n<body>\n<nav epub:type="toc" id="toc"><h1>Obsah</h1>\n${navList(tree)}\n</nav>\n<nav epub:type="landmarks" hidden="hidden"><ol><li><a epub:type="titlepage" href="text/titulni-strana.xhtml">Titulní strana</a></li><li><a epub:type="toc" href="text/obsah.xhtml">Obsah</a></li></ol></nav>\n</body>\n</html>\n`
  let order = 0
  const ncxPoints = (nodes) =>
    nodes
      .map((n) => {
        const o = ++order
        return `<navPoint id="n${o}" playOrder="${o}"><navLabel><text>${esc(n.title)}</text></navLabel><content src="${esc(firstHref(n))}"/>${ncxPoints(n.children)}</navPoint>`
      })
      .join('')
  const title = 'Dračí doupě II – Příručka a Bestiář (SRD)'
  const ncx = `<?xml version="1.0" encoding="utf-8"?>\n<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="${esc(id)}"/><meta name="dtb:depth" content="4"/><meta name="dtb:totalPageCount" content="0"/><meta name="dtb:maxPageNumber" content="0"/></head><docTitle><text>${esc(title)}</text></docTitle><navMap>${ncxPoints(tree)}</navMap></ncx>\n`

  // --- balíček
  const textFiles = out.map((f) => f.name.replace('OEBPS/', ''))
  const spine = [
    'text/titulni-strana.xhtml',
    'text/obsah.xhtml',
    ...chapters.map((c) => file(c.id)),
    ...idx.map(([iid]) => `text/${iid}.xhtml`),
  ]
  const imgList = [...new Map([...images.values()].map((i) => [i.path, i])).values()]
  const opf = `<?xml version="1.0" encoding="utf-8"?>\n<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="cs">\n<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n<dc:identifier id="bookid">${esc(id)}</dc:identifier>\n<dc:title>${esc(title)}</dc:title>\n<dc:language>cs</dc:language>\n<dc:creator>Altar (SRD drd2srd.d20.cz)</dc:creator>\n<meta property="dcterms:modified">${esc(date)}</meta>\n</metadata>\n<manifest>\n<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>\n<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>\n<item id="css" href="style.css" media-type="text/css"/>\n${textFiles.map((f, i) => `<item id="t${i}" href="${esc(f)}" media-type="application/xhtml+xml"/>`).join('\n')}\n${imgList.map((im, i) => `<item id="i${i}" href="${esc(im.path)}" media-type="${esc(im.type)}"/>`).join('\n')}\n</manifest>\n<spine toc="ncx">\n${spine.map((f) => `<itemref idref="t${textFiles.indexOf(f)}"/>`).join('\n')}\n</spine>\n</package>\n`
  const container = `<?xml version="1.0" encoding="utf-8"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>\n`

  const files = [
    { name: 'mimetype', data: enc.encode('application/epub+zip') },
    { name: 'META-INF/container.xml', data: enc.encode(container) },
    { name: 'OEBPS/content.opf', data: enc.encode(opf) },
    { name: 'OEBPS/nav.xhtml', data: enc.encode(nav) },
    { name: 'OEBPS/toc.ncx', data: enc.encode(ncx) },
    { name: 'OEBPS/style.css', data: enc.encode(CSS) },
    ...out.map((f) => ({ name: f.name, data: enc.encode(f.data) })),
    ...imgList.map((im) => ({ name: `OEBPS/${im.path}`, data: im.data })),
  ]
  return {
    files,
    warnings,
    stats: {
      chapters: chapters.length,
      creatures: creatureAt.size,
      indexes: Object.fromEntries(idx.map(([iid, , , e]) => [iid, e.length])),
    },
  }
}

/** Styl pro čtečky s e-inkem: bez barev, písmo a velikost nechává na čtečce. */
const CSS = `body { margin: 0; line-height: 1.35; }
h1 { font-size: 1.6em; margin: 1em 0 .6em; page-break-before: always; }
h2 { font-size: 1.3em; margin: 1.2em 0 .4em; page-break-after: avoid; }
h3 { font-size: 1.1em; margin: 1em 0 .3em; page-break-after: avoid; }
h4 { font-size: 1em; font-style: italic; margin: .8em 0 .2em; page-break-after: avoid; }
p { margin: 0 0 .6em; text-align: left; hyphens: auto; }
ul { margin: 0 0 .6em; padding-left: 1.3em; }
blockquote { margin: .6em 0 .6em .4em; padding-left: .7em; border-left: 2px solid #000; }
.card { margin: .8em 0; padding: .4em .7em; border: 1px solid #000; }
.card-title { font-weight: bold; margin-bottom: .3em; }
.stat { margin: 0 0 .2em; }
.muted { font-size: .9em; }
.subtitle { font-size: 1.2em; }
table { border-collapse: collapse; margin: .6em 0; width: 100%; font-size: .95em; }
th, td { border: 1px solid #000; padding: .15em .35em; vertical-align: top; }
th { font-weight: bold; }
.img { text-align: center; }
img { max-width: 100%; }
.letters a { margin-right: .5em; }
ul.toc { list-style: none; padding-left: 0; }
ul.toc ul.toc { padding-left: 1.2em; }
ul.toc li { margin: .25em 0; }
.ix { margin: 0 0 .5em; hyphens: none; }
.sum { font-size: .9em; }
`
