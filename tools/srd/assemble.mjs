// Sestaví veřejné balíčky ze SRD pro web aplikace: content-packs/srd (zdrojový JSON + img/) → public/packs
// (konečné JSON s vloženými obrázky + index.json). Spouští se před `dev` a `build` (viz package.json).
// Použití: node tools/srd/assemble.mjs [zdrojová/složka/] [cílová/složka/]
import { assemble } from './assemble-lib.mjs'
import { PUBLIC_DIR, PUBLIC_PACK_IDS } from './public-packs.mjs'

const src = process.argv[2] ?? PUBLIC_DIR
const out = process.argv[3] ?? 'public/packs/'
const { packs } = assemble(src, out, PUBLIC_PACK_IDS)
if (!packs.length) console.log(`žádné balíčky ve ${src}: nic se nesestavilo`)
for (const p of packs) console.log(`${p.id} ${p.version}: ${Math.round(p.size / 1024)} kB`)
