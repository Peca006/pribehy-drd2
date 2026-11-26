// Lokální nástroj: sestaví z veřejných balíčků SRD (content-packs/srd) jednu knihu ePub pro čtečku (Příručka +
// Bestiář, vnitřní odkazy, rejstříky). Výstup patří mimo git (výchozí `content-packs/local/epub/`, gitignorováno).
// Obrázky se převedou na šedotónové JPEG (e-ink). Použití: node tools/epub/build.mjs [--out soubor.epub]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import sharp from 'sharp'
import { writeZip } from '../../src/core/skin/zip.ts'
import { buildEpub } from './lib.mjs'

const SRC = 'content-packs/srd/'
const argOut = process.argv.indexOf('--out')
const out = argOut > 0 ? process.argv[argOut + 1] : 'content-packs/local/epub/drd2-srd.epub'
/** Největší šířka obrázku v knize (displej PocketBooku má kolem 1072 px). */
const MAX_WIDTH = 1000

const packs = ['drd2-pravidla-2.json', 'drd2-bestiar-2.json'].map((f) =>
  JSON.parse(readFileSync(SRC + f, 'utf8')),
)

const srcs = new Set()
const collect = (blocks) => {
  for (const b of blocks) {
    if (b.type === 'image') srcs.add(b.src)
    if (b.blocks) collect(b.blocks)
  }
}
for (const p of packs) for (const c of p.chapters ?? []) collect(c.blocks)

const images = new Map()
for (const src of srcs) {
  const data = await sharp(SRC + src)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .grayscale()
    .jpeg({ quality: 82 })
    .toBuffer()
  const name = src
    .split('/')
    .pop()
    .replace(/-[A-Za-z0-9_]{8}\.webp$/, '')
    .replace(/\.webp$/, '')
  images.set(src, { path: `img/${name}.jpg`, type: 'image/jpeg', data: new Uint8Array(data) })
}

const date = new Date().toISOString().replace(/\.\d+Z$/, 'Z')
const { files, warnings, stats } = buildEpub({ packs, images, date })
mkdirSync(dirname(out), { recursive: true })
const zip = await writeZip(files)
writeFileSync(out, zip)
console.log(`Hotovo: ${out} (${(zip.length / 1024).toFixed(0)} kB, ${files.length} souborů)`)
console.log(JSON.stringify(stats))
if (warnings.length) console.warn(`Upozornění (${warnings.length}):\n- ${warnings.join('\n- ')}`)
