// Zkopíruje hotové balíčky ze SRD z content-packs/local/ do veřejné složky content-packs/srd/
// a zapíše katalog index.json (verze, číslo sestavení, velikost, SHA-256).
// Použití: node tools/srd/publish.mjs   (nejdřív node tools/srd/build.mjs a build-bestiar.mjs)
import { createHash } from 'node:crypto'
import { copyFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { LOCAL_DIR, PUBLIC_DIR, PUBLIC_PACK_IDS } from './public-packs.mjs'

mkdirSync(PUBLIC_DIR, { recursive: true })
const packs = PUBLIC_PACK_IDS.map((id) => {
  const file = `${id}.json`
  const text = readFileSync(`${LOCAL_DIR}${file}`)
  const m = JSON.parse(text.toString('utf8')).manifest
  copyFileSync(`${LOCAL_DIR}${file}`, `${PUBLIC_DIR}${file}`)
  return {
    id: m.id,
    name: m.name,
    version: m.version,
    build: m.build ?? 0,
    file,
    size: statSync(`${PUBLIC_DIR}${file}`).size,
    sha256: createHash('sha256').update(text).digest('hex'),
  }
})
writeFileSync(`${PUBLIC_DIR}index.json`, JSON.stringify({ format: 1, packs }, null, 2) + '\n')
for (const p of packs) console.log(`${p.id} ${p.version} (sestavení ${p.build}, ${Math.round(p.size / 1024)} kB)`)
