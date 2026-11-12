// Obrázky ze SRD se do balíčku vkládají přímo do JSONu jako `data:image/webp;base64,…`.
// Zdrojové PNG se stahují ručně do reference/srd/assets/ (gitignorováno), viz `missingImages`.
import { existsSync, readFileSync } from 'node:fs'
import { basename } from 'node:path'
import sharp from 'sharp'

const MAX_SIDE = 1600

/** Projde bloky kapitoly (i vnořené) a zavolá `fn` pro každý blok `image`. */
export function walkImages(blocks, fn) {
  for (const b of blocks) {
    if (b.type === 'image') fn(b)
    else if (b.blocks) walkImages(b.blocks, fn)
  }
}

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

/** Nahradí `src` obrázků data URI ve WebP (zmenšení jen u příliš velkých). Vrací počet a velikost. */
export async function embedImages(chapters, assetsDir) {
  const cache = new Map()
  let bytes = 0
  for (const ch of chapters) {
    const jobs = []
    walkImages(ch.blocks, (b) => jobs.push(b))
    for (const b of jobs) {
      const file = basename(b.src)
      if (!cache.has(file)) {
        const webp = await sharp(readFileSync(`${assetsDir}${file}`))
          .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 85, effort: 6 })
          .toBuffer()
        bytes += webp.length
        cache.set(file, `data:image/webp;base64,${webp.toString('base64')}`)
      }
      b.src = cache.get(file)
    }
  }
  return { count: cache.size, bytes }
}
