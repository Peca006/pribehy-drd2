// Obrázky ze SRD se do balíčku vkládají přímo do JSONu jako `data:image/webp;base64,…`.
// Zdrojové PNG se stahují ručně do reference/srd/assets/ (gitignorováno), viz `missingImages`.
// (Prohlížečová verze s canvasem je v tools/srd/browser/entry.mjs.)
import { existsSync, readFileSync } from 'node:fs'
import sharp from 'sharp'
import { basename, walkImages } from './pipeline.mjs'

const MAX_SIDE = 1600

export { walkImages }

/** Názvy souborů obrázků, které chybí v `assetsDir`. */
export function missingImages(chapters, assetsDir) {
  const out = new Set()
  for (const ch of chapters)
    walkImages(ch.blocks, (b) => {
      if (!b.src.startsWith('data:') && !existsSync(`${assetsDir}${basename(b.src)}`))
        out.add(basename(b.src))
    })
  return [...out]
}

/** Načítač obrázků pro `embedImagesWith`: zmenší (jen příliš velké) a převede na WebP. */
export function nodeImageLoader(assetsDir) {
  let bytes = 0
  const load = async (_src, file) => {
    const webp = await sharp(readFileSync(`${assetsDir}${file}`))
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85, effort: 6 })
      .toBuffer()
    bytes += webp.length
    return `data:image/webp;base64,${webp.toString('base64')}`
  }
  load.bytes = () => bytes
  return load
}
