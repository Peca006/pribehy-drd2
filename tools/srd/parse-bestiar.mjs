// Převod stránek Bestiáře ze SRD (h3 = bytost, div.card = karta, h4 = oddíly) na bytosti obsahového balíčku.
import { parse } from 'node-html-parser'
import { blockMd, inlineMd, slug, stripMd } from './html-md.mjs'

export const KINDS = {
  '02-lide': { id: 'lide', name: 'Lidé' },
  '03-zvirata': { id: 'zvirata', name: 'Zvířata' },
  '04-nemrtvi': { id: 'nemrtvi', name: 'Nemrtví a oživení' },
  '05-besi': { id: 'besi', name: 'Běsi' },
  '06-netvori': { id: 'netvori', name: 'Netvoři' },
}

const SECTIONS = [
  [/^Jak jedn/i, 'jak-jedna'],
  [/^Jak bojuj/i, 'jak-bojuje'],
  [/^Jak(ou)? rol/i, 'role-v-pribehu'],
  [/^Snový/i, 'snovy-svet'],
]

/** „1—3 (zejména běh)“ → { min: 1, max: 3, note }. */
export function parseCharacteristic(text) {
  const m = stripMd(text).match(/^\s*(\d+)(?:\s*[—–-]\s*(\d+))?\s*(?:\(([^]*)\))?\s*$/)
  if (!m) return undefined
  const c = { min: Number(m[1]), max: Number(m[2] ?? m[1]) }
  const note = text.match(/\(([^]*)\)\s*$/)
  if (note) c.note = note[1].trim()
  return c
}

/** „Tělo 4, Duše 2, Vliv 3“ → { Tělo: 4, Duše: 2, Vliv: 3 }. */
export function parseLimits(text) {
  const out = {}
  for (const m of stripMd(text).matchAll(/(Tělo|Duše|Vliv)\s+(\d+)/g)) out[m[1]] = Number(m[2])
  return Object.keys(out).length ? out : undefined
}

function stats(card) {
  const rows = []
  for (const li of card.querySelectorAll('li')) {
    const m = inlineMd(li)
      .trim()
      .match(/^\*\*([^*]+?):?\*\*:?\s*([^]*)$/)
    if (m) rows.push({ label: m[1].trim(), value: m[2].trim() })
  }
  return rows
}

/** Nadpisy druhé úrovně v kapitole Bestiář základních pravidel → druh bytostí. */
const RULES_KINDS = {
  Zvířata: 'zvirata',
  Lidé: 'lide',
  Nemrtví: 'nemrtvi',
  Oživení: 'nemrtvi',
  Běsi: 'besi',
  Netvoři: 'netvori',
}

/** `kindFile` je např. `04-nemrtvi` (viz KINDS). */
export function parseCreatures(html, kindFile, sourceId) {
  return parseList(html, () => KINDS[kindFile].id, sourceId)
}

/** Bytosti z kapitoly Bestiář základních pravidel: druh určuje nadpis h2, bytosti mimo druhy se přeskočí. */
export function parseRulesCreatures(html, sourceId) {
  let kind
  return parseList(html, (h2) => (h2 === undefined ? kind : (kind = RULES_KINDS[h2])), sourceId)
}

/** `kindOf(h2?)`: bez argumentu vrátí aktuální druh, s názvem h2 ho přepne. */
function parseList(html, kindOf, sourceId) {
  const content = parse(html).querySelector('#content')
  if (!content) throw new Error('Stránka SRD nemá #content.')
  /** @type {any[]} */
  const creatures = []
  /** @type {any} */
  let cur
  /** @type {any} */
  let section
  /** @type {any} */
  let lastBase

  for (const el of /** @type {any[]} */ (content.childNodes)) {
    const tag = el.rawTagName?.toLowerCase()
    if (!tag) continue
    if (tag === 'h2') {
      kindOf(stripMd(inlineMd(el)).trim())
      cur = undefined
    } else if (tag === 'h3') {
      const kindId = kindOf()
      if (!kindId) {
        cur = undefined
        continue
      }
      const glyph = el.querySelector('.drd2-font')
      const glyphs = glyph?.text.trim()
      glyph?.remove()
      let name = stripMd(inlineMd(el)).replace(/\s+/g, ' ').trim()
      const variant = /^Varianta:\s*/.test(name)
      name = name.replace(/^Varianta:\s*/, '')
      cur = {
        id: `bytost:${slug(name)}`,
        name,
        kind: kindId,
        ...(glyphs ? { glyphs } : {}),
        ...(variant && lastBase ? { variantOf: lastBase.id } : {}),
        stats: [],
        description: '',
        sections: [],
        ...(sourceId ? { source: sourceId } : {}),
      }
      if (!variant) lastBase = cur
      creatures.push(cur)
      section = undefined
    } else if (!cur) continue
    else if (tag === 'h4') {
      const title = stripMd(inlineMd(el)).trim().replace(/:$/, '')
      const known = SECTIONS.find(([re]) => /** @type {RegExp} */ (re).test(title))
      section = { id: known ? known[1] : slug(title), title, text: '' }
      cur.sections.push(section)
    } else if (tag === 'div' && el.classList.contains('card')) {
      const rows = stats(el)
      if (!rows.length) continue // obecné pravidlo pro celou kapitolu, ne karta bytosti
      cur.stats = rows
      for (const r of rows) {
        if (r.label === 'Charakteristika') cur.characteristic = parseCharacteristic(r.value)
        if (r.label === 'Sudba' && /^\d+$/.test(stripMd(r.value).trim()))
          cur.fate = Number(stripMd(r.value).trim())
        if (r.label === 'Hranice') cur.limits = parseLimits(r.value)
      }
    } else if (['p', 'ul', 'blockquote'].includes(tag)) {
      const text =
        tag === 'blockquote' ? el.querySelectorAll('p').map(blockMd).join('\n\n') : blockMd(el)
      if (!text) continue
      if (section) section.text += (section.text ? '\n\n' : '') + text
      else cur.description += (cur.description ? '\n\n' : '') + text
    }
  }
  return creatures
}
