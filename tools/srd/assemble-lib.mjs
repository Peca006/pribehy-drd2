// Sestavení konečného balíčku ze zdrojového tvaru: zdrojový JSON má u obrázků odkaz `img/NAZEV.webp`
// (soubor leží vedle v `img/`), konečný balíček má obrázky vložené jako `data:image/webp;base64,…`.
// Repozitář drží jen zdrojový tvar (čitelné diffy textu, binární obrázky se ukládají jednou);
// konečné balíčky vznikají při sestavení aplikace (`tools/srd/assemble.mjs`).
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { walkImages } from './pipeline.mjs'

export const IMG_PREFIX = 'img/'

/** Zdrojový balíček (objekt) → konečný JSON text s vloženými obrázky; chybějící obrázek je chyba. */
export function inlineImages(pack, imgDir) {
  const cache = new Map()
  for (const ch of pack.chapters ?? [])
    walkImages(ch.blocks, (b) => {
      if (!b.src.startsWith(IMG_PREFIX)) return
      const name = b.src.slice(IMG_PREFIX.length)
      // jen prostý název souboru: odkaz nesmí vést mimo složku obrázků
      if (!/^[\w.-]+\.webp$/.test(name)) throw new Error(`neplatný odkaz na obrázek: ${b.src}`)
      if (!cache.has(name)) {
        const file = `${imgDir}${name}`
        if (!existsSync(file)) throw new Error(`chybí obrázek ${file}`)
        cache.set(name, `data:image/webp;base64,${readFileSync(file).toString('base64')}`)
      }
      b.src = cache.get(name)
    })
  return JSON.stringify(pack, null, 1)
}

/** Odkazy na obrázky ve zdrojovém balíčku (bez duplicit). */
export function imageRefs(pack) {
  const out = new Set()
  for (const ch of pack.chapters ?? [])
    walkImages(ch.blocks, (b) => {
      if (b.src.startsWith(IMG_PREFIX)) out.add(b.src.slice(IMG_PREFIX.length))
    })
  return [...out]
}

/**
 * Sestaví všechny balíčky ze `srcDir` (`ID.json` + `img/`) do `outDir` a zapíše katalog `index.json`
 * (verze, sestavení, velikost, SHA-256 konečných souborů). Vrací katalog. Bez balíčků nic nezapíše.
 */
export function assemble(srcDir, outDir, ids) {
  const packs = []
  for (const id of ids) {
    const src = `${srcDir}${id}.json`
    if (!existsSync(src)) continue
    const pack = JSON.parse(readFileSync(src, 'utf8'))
    const json = inlineImages(pack, `${srcDir}${IMG_PREFIX}`)
    mkdirSync(outDir, { recursive: true })
    writeFileSync(`${outDir}${id}.json`, json)
    const bytes = readFileSync(`${outDir}${id}.json`)
    const m = pack.manifest
    packs.push({
      id: m.id,
      name: m.name,
      version: m.version,
      build: m.build ?? 0,
      file: `${id}.json`,
      size: statSync(`${outDir}${id}.json`).size,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    })
  }
  const catalog = { format: 1, packs }
  if (packs.length) writeFileSync(`${outDir}index.json`, JSON.stringify(catalog, null, 2) + '\n')
  return catalog
}
