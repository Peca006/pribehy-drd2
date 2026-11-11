import { parse } from 'node-html-parser'
import { inlineMd, slug, srdFix, stripMd } from './html-md.mjs'

const plain = (el) => srdFix(stripMd(inlineMd(el)).replace(/\s+/g, ' ').trim())

function listItem(li) {
  const parts = []
  let sub
  for (const c of li.childNodes) {
    const tag = c.rawTagName?.toLowerCase()
    if (tag === 'ul' || tag === 'ol')
      sub = [...(sub ?? []), ...c.childNodes.filter((n) => n.rawTagName === 'li').map(listItem)]
    else if (tag === 'p') parts.push(inlineMd(c).trim())
    else if (c.nodeType === 3 || tag) parts.push(tag ? inlineMd({ childNodes: [c] }) : c.text)
  }
  const text = parts
    .join(parts.length > 1 && li.querySelector('p') ? '\n\n' : '')
    .replace(/[ \t]+/g, ' ')
    .trim()
  return sub ? { text, items: sub } : { text }
}

function table(el) {
  const header = el.querySelectorAll('thead th')
  const align = header.map(
    (th) => /text-align:\s*(right|center)/.exec(th.getAttribute('style') ?? '')?.[1] ?? 'left',
  )
  return {
    type: 'table',
    header: header.map((th) => inlineMd(th).trim()),
    align,
    rows: el
      .querySelectorAll('tbody tr')
      .map((tr) => tr.querySelectorAll('td').map((td) => inlineMd(td).trim())),
  }
}

/** Převede potomky kontejneru na pole bloků. */
export function parseBlocks(container) {
  const blocks = []
  for (const el of container.childNodes) {
    const tag = el.rawTagName?.toLowerCase()
    if (!tag) continue
    if (/^h[2-5]$/.test(tag)) {
      const text = plain(el)
      blocks.push({
        type: 'heading',
        level: Math.min(Number(tag[1]), 4),
        id: el.getAttribute('id') ?? slug(text),
        text,
      })
    } else if (tag === 'p') {
      const img = el.querySelector('img')
      if (img && !plain(el))
        blocks.push({
          type: 'image',
          alt: img.getAttribute('alt') ?? '',
          src: img.getAttribute('src'),
        })
      else blocks.push({ type: 'p', text: inlineMd(el).trim() })
    } else if (tag === 'ul' || tag === 'ol') {
      blocks.push({
        type: 'list',
        items: el.childNodes.filter((n) => n.rawTagName === 'li').map(listItem),
      })
    } else if (tag === 'blockquote') {
      blocks.push({ type: 'quote', blocks: parseBlocks(el) })
    } else if (tag === 'div' && el.getAttribute('class')?.split(' ').includes('card')) {
      const head = el.querySelector('.card__header')
      const rest = { childNodes: el.childNodes.filter((n) => n !== head) }
      blocks.push({ type: 'card', title: head ? plain(head) : '', blocks: parseBlocks(rest) })
    } else if (tag === 'table') blocks.push(table(el))
    else if (tag === 'hr') blocks.push({ type: 'rule' })
    else if (tag !== 'h1') throw new Error(`neznámý prvek <${tag}>`)
  }
  return blocks
}

/** `id` kapitoly je název souboru bez předpony a přípony, např. `31-zakladni-pravidla`. */
export function parseChapter(html, id) {
  const content = parse(html).querySelector('#content')
  const h1 = content.querySelector('h1')
  return { id, title: plain(h1), blocks: parseBlocks(content) }
}
