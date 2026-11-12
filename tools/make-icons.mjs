// Vytvoří PNG ikony aplikace (pro instalaci na plochu) z public/favicon.svg. Spuštění: node tools/make-icons.mjs
// Výsledek (public/icons/) je v repozitáři; skript je jen pro případnou změnu vzhledu ikony.
import { mkdirSync, readFileSync } from 'node:fs'
import sharp from 'sharp'

const svg = readFileSync('public/favicon.svg')
mkdirSync('public/icons', { recursive: true })

const plain = async (size, file) =>
  sharp(svg, { density: Math.ceil((72 * size) / 64) }).resize(size, size).png().toFile(`public/icons/${file}`)

// maskable: motiv v bezpečné zóně (80 %), plné pozadí do okrajů, aby ho systém mohl libovolně oříznout
const maskable = async (size, file) => {
  const inner = Math.round(size * 0.78)
  const icon = await sharp(svg, { density: Math.ceil((72 * inner) / 64) }).resize(inner, inner).png().toBuffer()
  return sharp({ create: { width: size, height: size, channels: 4, background: '#1c1a17' } })
    .composite([{ input: icon, gravity: 'centre' }])
    .png()
    .toFile(`public/icons/${file}`)
}

await plain(192, 'icon-192.png')
await plain(512, 'icon-512.png')
await maskable(512, 'icon-maskable-512.png')
await maskable(180, 'apple-touch-icon.png')
console.log('ikony: public/icons/')
