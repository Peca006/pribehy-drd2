import { NodeType } from 'node-html-parser'

/** Převede inline obsah elementu na mini-markdown (viz src/core/content/schema.ts). */
export function inlineMd(node) {
  let out = ''
  for (const c of node.childNodes) {
    if (c.nodeType === NodeType.TEXT_NODE) out += c.text
    else if (c.nodeType === NodeType.ELEMENT_NODE) {
      const inner = inlineMd(c)
      const tag = c.rawTagName?.toLowerCase()
      if (tag === 'em') out += wrap(inner, '*')
      else if (tag === 'strong') out += wrap(inner, '**')
      else if (tag === 'br') out += '\n'
      else out += inner
    }
  }
  // zdvojené značky z vnořených em/strong (`<strong><em>x</em></strong>` => `***x***`) necháme být
  return out.replace(/­/g, '').replace(/[ \t]+/g, ' ')
}

function wrap(inner, mark) {
  const m = inner.match(/^(\s*)(.*?)(\s*)$/s)
  return m[2] ? `${m[1]}${mark}${m[2]}${mark}${m[3]}` : inner
}

export function blockMd(el) {
  const tag = el.rawTagName?.toLowerCase()
  if (tag === 'ul' || tag === 'ol') {
    return el
      .querySelectorAll('li')
      .map((li) => `- ${inlineMd(li).trim()}`)
      .join('\n')
  }
  return inlineMd(el).trim()
}

export function slug(s) {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
