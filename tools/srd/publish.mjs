// Zkopíruje hotové balíčky ze SRD z content-packs/local/ do veřejné složky content-packs/srd/
// a zapíše katalog index.json (verze, číslo sestavení, velikost, SHA-256).
// Použití: node tools/srd/publish.mjs [--check]   (nejdřív node tools/srd/build.mjs a build-bestiar.mjs)
// `--check` jen ukáže, co by se změnilo, a nic nezapíše.
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { LOCAL_DIR, PUBLIC_DIR, PUBLIC_PACK_IDS } from './public-packs.mjs'

const check = process.argv.includes('--check')
if (!check) mkdirSync(PUBLIC_DIR, { recursive: true })
const previous = existsSync(`${PUBLIC_DIR}index.json`)
  ? JSON.parse(readFileSync(`${PUBLIC_DIR}index.json`, 'utf8')).packs
  : []
const packs = PUBLIC_PACK_IDS.map((id) => {
  const file = `${id}.json`
  const text = readFileSync(`${LOCAL_DIR}${file}`)
  const m = JSON.parse(text.toString('utf8')).manifest
  const sha256 = createHash('sha256').update(text).digest('hex')
  const old = previous.find((p) => p.id === m.id)
  // beze změny obsahu se nic nepřepisuje (každá nová verze se trvale ukládá do historie gitu)
  if (old?.sha256 === sha256 && existsSync(`${PUBLIC_DIR}${file}`)) return { ...old, unchanged: true }
  if (!check) copyFileSync(`${LOCAL_DIR}${file}`, `${PUBLIC_DIR}${file}`)
  const target = check ? `${LOCAL_DIR}${file}` : `${PUBLIC_DIR}${file}`
  return {
    id: m.id,
    name: m.name,
    version: m.version,
    build: m.build ?? 0,
    file,
    size: statSync(target).size,
    sha256,
  }
})
if (!check)
  writeFileSync(
    `${PUBLIC_DIR}index.json`,
    JSON.stringify({ format: 1, packs: packs.map(({ unchanged: _u, ...p }) => p) }, null, 2) + '\n',
  )
for (const p of packs)
  console.log(
    `${p.id} ${p.version} (sestavení ${p.build}, ${Math.round(p.size / 1024)} kB): ${p.unchanged ? 'beze změny' : check ? 'liší se od zveřejněného' : 'AKTUALIZOVÁNO'}`,
  )
