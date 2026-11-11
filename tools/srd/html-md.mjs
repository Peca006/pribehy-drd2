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
      else if (tag === 'a') {
        const href = c.getAttribute('href')
        const anchorOnly = (c.getAttribute('class') ?? '').includes('header-anchor')
        out += href && !anchorOnly && inner.trim() ? link(href, inner) : inner
      } else out += inner
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

/** Odstraní z mini-markdownu odkazy (nechá jen text odkazu) a zvýrazňovací značky. */
export const stripMd = (s) => s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\*/g, '')

export function slug(s) {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Interní odkaz SRD `/zakladni-prirucka/31-xxx.html#kotva` => `chapter:31-xxx#kotva`; ostatní se ponechají. */
function link(href, text) {
  const m = href.match(/^\/(?:zakladni-prirucka|bestiar)\/([^#]+?)\.html(#.*)?$/)
  return `[${text}](${m ? `chapter:${m[1]}${m[2] ?? ''}` : href})`
}

/** Známé zjevné chyby zdrojového SRD (zbylé značky autora), opravené už při převodu. */
export function srdFix(text) {
  return text.replace(/\s*CHYBA!+/g, '')
}
