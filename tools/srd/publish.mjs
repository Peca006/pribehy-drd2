// Zkopíruje zdrojový tvar balíčků ze SRD z content-packs/local/src/ (JSON + img/*.webp) do veřejné složky
// content-packs/srd/. Konečné balíčky (s vloženými obrázky) a katalog index.json vznikají až při sestavení
// aplikace (`tools/srd/assemble.mjs`), v repozitáři jsou jen zdrojové soubory.
// Použití: node tools/srd/publish.mjs [--check]   (nejdřív node tools/srd/build.mjs a build-bestiar.mjs)
// `--check` jen ukáže, co by se změnilo, a nic nezapíše.
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { imageRefs } from './assemble-lib.mjs'
import { LOCAL_DIR, PUBLIC_DIR, PUBLIC_PACK_IDS } from './public-packs.mjs'

const check = process.argv.includes('--check')
const FROM = `${LOCAL_DIR}src/`
const same = (a, b) => existsSync(b) && readFileSync(a).equals(readFileSync(b))

const copy = (from, to, label) => {
  const unchanged = same(from, to)
  if (!unchanged && !check) {
    mkdirSync(to.slice(0, to.lastIndexOf('/')), { recursive: true })
    copyFileSync(from, to)
  }
  console.log(`${label}: ${unchanged ? 'beze změny' : check ? 'liší se od zveřejněného' : 'AKTUALIZOVÁNO'}`)
}

for (const id of PUBLIC_PACK_IDS) {
  const file = `${id}.json`
  if (!existsSync(`${FROM}${file}`)) throw new Error(`chybí ${FROM}${file}: spusťte build.mjs`)
  copy(`${FROM}${file}`, `${PUBLIC_DIR}${file}`, id)
  for (const img of imageRefs(JSON.parse(readFileSync(`${FROM}${file}`, 'utf8'))))
    copy(`${FROM}img/${img}`, `${PUBLIC_DIR}img/${img}`, `  img/${img}`)
}
