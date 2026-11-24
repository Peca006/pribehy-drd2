// Kontrola obrázků v Hávu (nedůvěryhodný vstup). Typ se určuje podle obsahu (podpis souboru), nikdy podle přípony
// ani deklarace v manifestu. Rastr (PNG, WebP, JPEG): z hlavičky se přečtou rozměry bez dekódování a omezí se,
// aby obří obrázek nezaplnil paměť. SVG: používá se jen jako obrázek na pozadí (nikdy vložený do stránky, takže se
// v něm nespustí skript a nenačte nic zvenčí), přesto se odmítají skripty, cizí odkazy a entity.

export type ImageType = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/svg+xml'

// BOM zapsaný přes kód: formátovač by jinak zápis BOM ve zdrojáku změnil na neviditelný znak
const BOM = String.fromCharCode(0xfeff)

export const MAX_IMAGE_SIDE = 4096
export const MAX_IMAGE_PIXELS = 4096 * 2048
export const MAX_SVG_BYTES = 512 * 1024

export interface ImageInfo {
  type: ImageType
  /** rozměry rastru (u SVG neznámé) */
  width?: number
  height?: number
}

export type ImageCheck = { ok: true; info: ImageInfo } | { ok: false; error: string }

const fail = (error: string): ImageCheck => ({ ok: false, error })
const ascii = (b: Uint8Array, at: number, s: string) =>
  b.length >= at + s.length && [...s].every((c, i) => b[at + i] === c.charCodeAt(0))

function sized(type: ImageType, width: number, height: number): ImageCheck {
  if (width < 1 || height < 1) return fail('obrázek má nulový rozměr')
  if (width > MAX_IMAGE_SIDE || height > MAX_IMAGE_SIDE) {
    return fail(`obrázek je větší než ${MAX_IMAGE_SIDE} px na delší straně (${width} × ${height})`)
  }
  if (width * height > MAX_IMAGE_PIXELS) {
    return fail(`obrázek má příliš mnoho pixelů (${width} × ${height})`)
  }
  return { ok: true, info: { type, width, height } }
}

function png(b: Uint8Array): ImageCheck {
  // podpis (8 B), pak blok IHDR: délka 13, název, šířka a výška (po 4 B, big endian)
  if (b.length < 33 || !ascii(b, 12, 'IHDR')) return fail('poškozený PNG')
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength)
  return sized('image/png', v.getUint32(16), v.getUint32(20))
}

function jpeg(b: Uint8Array): ImageCheck {
  // hledá blok SOFn (rozměry); bloky mají délku, takže se přeskakují
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength)
  let i = 2
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return fail('poškozený JPEG')
    const marker = b[i + 1]!
    if (marker === 0xff) {
      i++
      continue
    }
    const isSof =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
    if (isSof) return sized('image/jpeg', v.getUint16(i + 7), v.getUint16(i + 5))
    if (marker === 0xd9 || marker === 0xda) break // konec obrazu, rozměry nenalezeny
    i += 2 + v.getUint16(i + 2)
  }
  return fail('poškozený JPEG (chybí rozměry)')
}

function webp(b: Uint8Array): ImageCheck {
  if (b.length < 30) return fail('poškozený WebP')
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength)
  const kind = String.fromCharCode(b[12]!, b[13]!, b[14]!, b[15]!)
  if (kind === 'VP8 ')
    return sized('image/webp', v.getUint16(26, true) & 0x3fff, v.getUint16(28, true) & 0x3fff)
  if (kind === 'VP8L') {
    if (b[20] !== 0x2f) return fail('poškozený WebP')
    const bits = v.getUint32(21, true)
    return sized('image/webp', (bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1)
  }
  if (kind === 'VP8X') {
    const w = (b[24]! | (b[25]! << 8) | (b[26]! << 16)) + 1
    const h = (b[27]! | (b[28]! << 8) | (b[29]! << 16)) + 1
    return sized('image/webp', w, h)
  }
  return fail('nepodporovaný druh WebP')
}

/** Co SVG nesmí obsahovat: skripty, vnořený cizí obsah, entity (rozpínání), události, odkazy mimo sebe. */
const SVG_FORBIDDEN =
  /<\s*(script|foreignObject|iframe|embed|object|audio|video|link|animate\b[^>]*attributeName\s*=\s*["']?(href|xlink:href))|<!\s*(ENTITY|DOCTYPE)|\bon[a-z]+\s*=|javascript\s*:|@import/i

function svg(b: Uint8Array): ImageCheck {
  if (b.length > MAX_SVG_BYTES) return fail(`SVG je větší než ${MAX_SVG_BYTES / 1024} kB`)
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(b)
  } catch {
    return fail('SVG není platný text v UTF-8')
  }
  text = text.startsWith(BOM) ? text.slice(1) : text
  if (!/^\s*(<\?xml[^>]*\?>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(text))
    return fail('soubor není SVG')
  const bad = SVG_FORBIDDEN.exec(text)
  if (bad) return fail(`SVG obsahuje nepovolený prvek („${bad[0].trim().slice(0, 24)}“)`)
  // odkazy (href, xlink:href) smí mířit jen dovnitř souboru (#id)
  for (const m of text.matchAll(/\b(?:xlink:)?href\s*=\s*(["'])(.*?)\1/gi)) {
    if (!m[2]!.startsWith('#'))
      return fail('SVG odkazuje mimo sebe (povolené jsou jen odkazy na #id)')
  }
  // url(...) v CSS i atributech smí mířit jen na #id
  for (const m of text.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)) {
    if (!m[2]!.startsWith('#')) return fail('SVG odkazuje mimo sebe (url() smí mířit jen na #id)')
  }
  return { ok: true, info: { type: 'image/svg+xml' } }
}

/** Určí typ obrázku podle obsahu a zkontroluje ho. */
export function inspectImage(bytes: Uint8Array): ImageCheck {
  if (bytes.length < 8) return fail('soubor je příliš krátký na obrázek')
  if (bytes[0] === 0x89 && ascii(bytes, 1, 'PNG\r\n') && bytes[6] === 0x1a && bytes[7] === 0x0a)
    return png(bytes)
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return jpeg(bytes)
  if (ascii(bytes, 0, 'RIFF') && ascii(bytes, 8, 'WEBP')) return webp(bytes)
  const head = new TextDecoder().decode(bytes.subarray(0, 512))
  if (/<svg[\s>]/i.test(head)) return svg(bytes)
  return fail('nepodporovaný druh obrázku (povoleno PNG, WebP, JPEG a SVG)')
}
