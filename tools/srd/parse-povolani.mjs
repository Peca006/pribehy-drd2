import { parse } from 'node-html-parser'
import { blockMd, inlineMd, slug } from './html-md.mjs'

const ATTRS = ['Tělo', 'Duše', 'Vliv']

const headingText = (el) => inlineMd(el).replace(/[*]/g, '').trim()

/** Rozloží nadpis „Název (Tělo, rychlá volba: Úroveň 3)“. */
export function parseTitle(text) {
  const m = text.match(/^(.*?)\s*\(([^)]*)\)\s*$/)
  if (!m) return { name: text.trim() }
  const parts = m[2].split(',').map((s) => s.trim())
  const attribute = parts.find((p) => ATTRS.includes(p))
  const quick = parts.map((p) => p.match(/rychlá volba:\s*Úroveň\s*(\d+)/i)).find(Boolean)
  return { name: m[1].trim(), attribute, quickPickLevel: quick ? Number(quick[1]) : undefined }
}

const isFlavor = (el) => {
  const kids = el.childNodes.filter((n) => n.text.trim())
  return (
    el.rawTagName === 'p' &&
    kids.length === 1 &&
    kids[0].rawTagName === 'em' &&
    /^\*\*\*/.test(inlineMd(el).trim())
  )
}

/** Z HTML stránky SRD s povoláními (h2 = povolání, h3 = sekce, h4 = dovednost/schopnost). */
export function parseProfessions(html, kind) {
  const main = parse(html).querySelector('main')
  const professions = []
  let prof, section, item

  for (const el of (main.querySelector('#content') ?? main).childNodes) {
    const tag = el.rawTagName?.toLowerCase()
    if (!tag) continue
    if (tag === 'h2') {
      const name = headingText(el)
      prof = { id: `povolani:${slug(name)}`, name, kind, intro: '', skills: [], abilities: [] }
      professions.push(prof)
      section = 'intro'
      item = undefined
    } else if (!prof) continue
    else if (tag === 'h3') {
      const t = headingText(el)
      section = t === 'Dovednosti' ? 'skills' : t === 'Zvláštní schopnosti' ? 'abilities' : 'other'
      item = undefined
    } else if (tag === 'h4' && (section === 'skills' || section === 'abilities')) {
      const t = parseTitle(headingText(el))
      const key = slug(t.name)
      item =
        section === 'skills'
          ? {
              id: `dovednost:${slug(prof.name)}/${key}`,
              name: t.name,
              attribute: t.attribute,
              items: [],
            }
          : {
              id: `schopnost:${slug(prof.name)}/${key}`,
              name: t.name,
              attribute: t.attribute,
              quickPickLevel: t.quickPickLevel,
              text: '',
            }
      for (const k of Object.keys(item)) if (item[k] === undefined) delete item[k]
      prof[section].push(item)
    } else if (section === 'intro' && ['p', 'ul'].includes(tag)) {
      prof.intro += (prof.intro ? '\n\n' : '') + blockMd(el)
    } else if (item && section === 'skills') {
      if (tag === 'ul')
        item.items.push(...el.querySelectorAll('li').map((li) => inlineMd(li).trim()))
      else if (tag === 'p') item.items.push(blockMd(el))
    } else if (item && section === 'abilities') {
      if (tag === 'p' && isFlavor(el) && item.flavor === undefined && !item.text)
        item.flavor = blockMd(el)
      else if (['p', 'ul'].includes(tag)) item.text += (item.text ? '\n\n' : '') + blockMd(el)
    }
  }
  return professions
}
