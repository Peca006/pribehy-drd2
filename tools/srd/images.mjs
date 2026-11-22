// Obrázky ze SRD: zdrojový balíček na ně odkazuje (`img/NAZEV.webp`), konečný balíček je má vložené jako
// `data:image/webp;base64,…` (viz `assemble-lib.mjs`).
// Zdrojové PNG se stahují ručně do reference/srd/assets/ (gitignorováno), viz `missingImages`.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
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

/**
 * Načítač obrázků pro `embedImagesWith` do zdrojového tvaru: zmenšený WebP se zapíše do `outDir`
 * a v balíčku zůstane odkaz `img/NAZEV.webp`. Už existující soubor se NEPŘEPISUJE (bajty se mezi sestaveními
 * nemění, git je uloží jen jednou); `force` ho vytvoří znovu (změnil se zdrojový obrázek).
 */
export function fileImageLoader(assetsDir, outDir, { force = false } = {}) {
  let written = 0
  const load = async (_src, file) => {
    const name = `${file.replace(/\.[^.]+$/, '')}.webp`
    const target = `${outDir}${name}`
    if (force || !existsSync(target)) {
      const webp = await sharp(readFileSync(`${assetsDir}${file}`))
        .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85, effort: 6 })
        .toBuffer()
      mkdirSync(outDir, { recursive: true })
      writeFileSync(target, webp)
      written++
    }
    return `img/${name}`
  }
  load.written = () => written
  return load
}
