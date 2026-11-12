// Lokální nástroj: převede stažené stránky SRD (reference/srd) na obsahový balíček.
// Výstup patří do content-packs/local/ (gitignorováno – texty jsou autorské dílo).
// Použití: node tools/srd/build.mjs
// Totéž dělá bookmarklet přímo v prohlížeči (viz tools/srd/browser/entry.mjs), obě cesty sdílí `pipeline.mjs`.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { buildRulesChapters, embedImagesWith, finishRulesPack } from './pipeline.mjs'
import { missingImages, nodeImageLoader } from './images.mjs'

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
const loader = nodeImageLoader(assets)
const count = await embedImagesWith(built.chapters, loader)
const { json, problems } = finishRulesPack(built)
if (problems.length) {
  console.error(problems.join('\n'))
  process.exit(1)
}

mkdirSync('content-packs/local', { recursive: true })
writeFileSync('content-packs/local/drd2-pravidla-2.json', json)
console.log(
  `kapitol: ${built.chapters.length}, povolání: ${built.professions.length}, schopností: ${built.professions.reduce((n, p) => n + p.abilities.length, 0)}, obrázků: ${count} (${Math.round(loader.bytes() / 1024)} kB WebP)`,
)
