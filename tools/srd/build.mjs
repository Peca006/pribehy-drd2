// Lokální nástroj: převede stažené stránky SRD (reference/srd) na obsahový balíček.
// Výstup patří do content-packs/local/ (gitignorováno): `src/` je zdrojový tvar (JSON + img/*.webp, z něj se
// publikuje), `drd2-pravidla-2.json` je konečný balíček s vloženými obrázky (k ručnímu načtení do aplikace).
// `--force-images` znovu vytvoří WebP (změnil se zdrojový obrázek).
// Použití: node tools/srd/build.mjs
// Totéž dělá bookmarklet přímo v prohlížeči (viz tools/srd/browser/entry.mjs), obě cesty sdílí `pipeline.mjs`.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { buildRulesChapters, embedImagesWith, finishRulesPack } from './pipeline.mjs'
import { fileImageLoader, missingImages } from './images.mjs'
import { inlineImages } from './assemble-lib.mjs'

const dir = 'reference/srd/'
const pages = Object.fromEntries(
  readdirSync(dir)
    .filter((f) => f.startsWith('zakladni-prirucka__'))
    .map((f) => [
      f.replace('zakladni-prirucka__', '').replace('.html', ''),
      readFileSync(`${dir}${f}`, 'utf8'),
    ]),
)

const built = buildRulesChapters(pages)
const assets = `${dir}assets/`
const missing = missingImages(built.chapters, assets)
if (missing.length) {
  console.error(`Chybí obrázky v ${assets}: ${missing.join(', ')} (stáhnout z drd2srd.d20.cz/assets/)`)
  process.exit(1)
}
const srcDir = 'content-packs/local/src/'
const loader = fileImageLoader(assets, `${srcDir}img/`, { force: process.argv.includes('--force-images') })
const count = await embedImagesWith(built.chapters, loader)
const { json, problems } = finishRulesPack(built)
if (problems.length) {
  console.error(problems.join('\n'))
  process.exit(1)
}

mkdirSync(srcDir, { recursive: true })
writeFileSync(`${srcDir}drd2-pravidla-2.json`, json)
writeFileSync('content-packs/local/drd2-pravidla-2.json', inlineImages(JSON.parse(json), `${srcDir}img/`))
console.log(
  `kapitol: ${built.chapters.length}, povolání: ${built.professions.length}, schopností: ${built.professions.reduce((n, p) => n + p.abilities.length, 0)}, obrázků: ${count} (nově zapsáno: ${loader.written()})`,
)
