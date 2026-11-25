// Grafika vestavěného Háva Podzemí (retro PC RPG: tmavý kámen, měď, zlato a drahokamy), vyrobená programově jako SVG.
// Barvy jsou na jednom místě, takže grafika vždy ladí s paletou. Každý obrázek je samostatné SVG, které projde stejnou
// kontrolou (`inspectImage`) jako obrázky z cizích Hávů: žádné skripty ani odkazy mimo soubor, jen tvary a filtry.

const STONE = '#130d1c'
const COPPER = { light: '#e9ad6b', mid: '#b87333', dark: '#6d3f17', deep: '#2a1608' }
const GOLD = { light: '#ffe08a', mid: '#f2c14e', dark: '#a8761a' }

const svg = (w: number, h: number, body: string, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"${extra}>${body}</svg>`

/** Mramorové pozadí: tmavý kámen s oblačností a tenkými žilkami. Šum se na okrajích napojuje, dlaždice jde opakovat. */
export function marble(): string {
  return svg(
    256,
    256,
    `<defs>
<filter id="cloud" filterUnits="userSpaceOnUse" x="0" y="0" width="256" height="256" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="0.006 0.009" numOctaves="3" seed="4" stitchTiles="stitch"/>
<feColorMatrix type="matrix" values="0 0 0 0 0.24  0 0 0 0 0.15  0 0 0 0 0.36  0 0 0 1.1 -0.28"/>
</filter>
<filter id="veins" filterUnits="userSpaceOnUse" x="0" y="0" width="256" height="256" color-interpolation-filters="sRGB">
<feTurbulence type="turbulence" baseFrequency="0.008 0.013" numOctaves="4" seed="11" stitchTiles="stitch"/>
<feColorMatrix type="matrix" values="0 0 0 0 0.62  0 0 0 0 0.48  0 0 0 0 0.82  -9 0 0 0 1.3"/>
</filter>
</defs>
<rect width="256" height="256" fill="${STONE}"/>
<rect width="256" height="256" filter="url(#cloud)" opacity="0.55"/>
<rect width="256" height="256" filter="url(#veins)" opacity="0.32"/>`,
  )
}

/** Měděný rám panelu 36 × 36 (devítidílný, řez 12): měděné pásmo, zlatá linka uvnitř a nýty v rozích. Střed je průhledný. */
export function copperFrame(): string {
  const rivet = (x: number, y: number) =>
    `<circle cx="${x}" cy="${y}" r="2.4" fill="${GOLD.dark}"/><circle cx="${x - 0.4}" cy="${y - 0.4}" r="1.6" fill="${GOLD.mid}"/><circle cx="${x - 0.8}" cy="${y - 0.8}" r="0.7" fill="${GOLD.light}"/>`
  return svg(
    36,
    36,
    `<defs><linearGradient id="cu" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${COPPER.light}"/><stop offset="0.5" stop-color="${COPPER.mid}"/><stop offset="1" stop-color="${COPPER.dark}"/></linearGradient></defs>
<rect x="0.5" y="0.5" width="35" height="35" fill="none" stroke="${COPPER.deep}"/>
<rect x="4" y="4" width="28" height="28" fill="none" stroke="url(#cu)" stroke-width="6"/>
<rect x="8.5" y="8.5" width="19" height="19" fill="none" stroke="${GOLD.mid}"/>
<rect x="9.5" y="9.5" width="17" height="17" fill="none" stroke="#000" stroke-opacity="0.45"/>
${rivet(4, 4)}${rivet(32, 4)}${rivet(4, 32)}${rivet(32, 32)}`,
  )
}

/** Rám dialogu 48 × 48 (devítidílný, řez 16): zlaté pásmo s měděnou vložkou a rohové destičky s rubíny. Střed je průhledný. */
export function dialogFrame(): string {
  const corner = (x: number, y: number) =>
    `<rect x="${x}" y="${y}" width="14" height="14" fill="url(#gd)" stroke="${COPPER.deep}"/>
<rect x="${x + 1.5}" y="${y + 1.5}" width="11" height="11" fill="none" stroke="${GOLD.light}" stroke-opacity="0.55"/>
<circle cx="${x + 7}" cy="${y + 7}" r="3.6" fill="url(#rb)" stroke="#2a0510" stroke-width="0.8"/>
<circle cx="${x + 6}" cy="${y + 6}" r="1" fill="#fff" fill-opacity="0.7"/>`
  return svg(
    48,
    48,
    `<defs>
<linearGradient id="gd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${GOLD.light}"/><stop offset="0.5" stop-color="${GOLD.mid}"/><stop offset="1" stop-color="${GOLD.dark}"/></linearGradient>
<radialGradient id="rb" cx="0.35" cy="0.35" r="0.8"><stop offset="0" stop-color="#ff7a90"/><stop offset="1" stop-color="#7a0f26"/></radialGradient>
</defs>
<rect x="0.5" y="0.5" width="47" height="47" fill="none" stroke="${COPPER.deep}"/>
<rect x="4" y="4" width="40" height="40" fill="none" stroke="url(#gd)" stroke-width="6"/>
<rect x="8.5" y="8.5" width="31" height="31" fill="none" stroke="${COPPER.mid}" stroke-width="3"/>
<rect x="11.5" y="11.5" width="25" height="25" fill="none" stroke="#000" stroke-opacity="0.5"/>
${corner(1, 1)}${corner(33, 1)}${corner(1, 33)}${corner(33, 33)}`,
  )
}

/** Tlačítko jako safírový drahokam ve zlaté objímce 24 × 24 (devítidílné, řez 8). */
export function gemButton(): string {
  return svg(
    24,
    24,
    `<defs>
<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${GOLD.light}"/><stop offset="0.5" stop-color="${GOLD.mid}"/><stop offset="1" stop-color="${GOLD.dark}"/></linearGradient>
<linearGradient id="gem" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b5bd0"/><stop offset="1" stop-color="#14205f"/></linearGradient>
</defs>
<rect width="24" height="24" fill="#0b1240"/>
<rect x="1" y="1" width="22" height="22" fill="url(#gold)"/>
<rect x="3" y="3" width="18" height="18" fill="url(#gem)"/>
<path d="M3 3H21L19 5H5V19L3 21Z" fill="#fff" fill-opacity="0.2"/>
<path d="M21 3V21H3L5 19H19V5Z" fill="#000" fill-opacity="0.3"/>`,
  )
}

/** Horní lem spodní lišty záložek 32 × 6: měděné pásmo se zlatými kosočtverci (opakuje se vodorovně). */
export function tabRim(): string {
  return svg(
    32,
    6,
    `<defs><linearGradient id="rim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${COPPER.light}"/><stop offset="1" stop-color="${COPPER.dark}"/></linearGradient></defs>
<rect width="32" height="6" fill="${COPPER.deep}"/>
<rect y="1" width="32" height="3" fill="url(#rim)"/>
<path d="M16 0.5L19 2.5L16 4.5L13 2.5Z" fill="${GOLD.mid}"/>
<path d="M16 1.2L17.6 2.5L16 3.8L14.4 2.5Z" fill="${GOLD.light}"/>`,
  )
}

/** Pravý lem svislé lišty záložek 6 × 32 (svislý pruh vlevo): měděné pásmo se zlatými kosočtverci, opakuje se svisle. */
export function tabRimSide(): string {
  return svg(
    6,
    32,
    `<defs><linearGradient id="rim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${COPPER.light}"/><stop offset="1" stop-color="${COPPER.dark}"/></linearGradient></defs>
<rect width="6" height="32" fill="${COPPER.deep}"/>
<rect x="2" width="3" height="32" fill="url(#rim)"/>
<path d="M5.5 16L3.5 19L1.5 16L3.5 13Z" fill="${GOLD.mid}"/>
<path d="M4.8 16L3.5 17.6L2.2 16L3.5 14.4Z" fill="${GOLD.light}"/>`,
  )
}

/** Záhlaví 256 × 40 (opakuje se vodorovně): tmavý kámen mezi dvěma měděnými pásmy, uprostřed tlumený zlatý kosočtverec. */
export function headerPlate(): string {
  return svg(
    256,
    40,
    `<defs><linearGradient id="band" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${COPPER.light}"/><stop offset="1" stop-color="${COPPER.dark}"/></linearGradient>
<linearGradient id="plate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d2042"/><stop offset="1" stop-color="#1a1129"/></linearGradient></defs>
<rect width="256" height="40" fill="url(#plate)"/>
<rect width="256" height="4" fill="url(#band)"/>
<rect y="4" width="256" height="1" fill="${COPPER.deep}"/>
<rect y="36" width="256" height="4" fill="url(#band)"/>
<rect y="35" width="256" height="1" fill="${COPPER.deep}"/>
<path d="M128 11L135 20L128 29L121 20Z" fill="${GOLD.dark}" fill-opacity="0.55"/>
<path d="M128 14L132 20L128 26L124 20Z" fill="${GOLD.mid}" fill-opacity="0.45"/>`,
  )
}

/** Rohová ozdoba 96 × 96 pro levý horní roh (ostatní rohy aplikace zrcadlí): měděný oblouk se zlatým kosočtvercem. */
export function cornerOrnament(): string {
  return svg(
    96,
    96,
    `<defs><linearGradient id="arc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${COPPER.light}"/><stop offset="1" stop-color="${COPPER.dark}"/></linearGradient></defs>
<path d="M4 92V28C4 14 14 4 28 4H92V12H30C20 12 12 20 12 30V92Z" fill="url(#arc)"/>
<path d="M12 92V30C12 20 20 12 30 12H92V15H31C22 15 15 22 15 31V92Z" fill="${COPPER.deep}" fill-opacity="0.55"/>
<path d="M28 28L38 38L28 48L18 38Z" fill="${GOLD.dark}"/>
<path d="M28 30.5L35.5 38L28 45.5L20.5 38Z" fill="${GOLD.mid}"/>
<path d="M28 33L32.5 38L28 43L23.5 38Z" fill="${GOLD.light}"/>
<circle cx="52" cy="8" r="2.2" fill="${GOLD.mid}"/><circle cx="8" cy="52" r="2.2" fill="${GOLD.mid}"/>`,
  )
}

/** Dělicí ozdoba 48 × 8 (opakuje se vodorovně): měděná linka a zlatý kosočtverec. */
export function divider(): string {
  return svg(
    48,
    8,
    `<rect y="3" width="48" height="2" fill="${COPPER.mid}"/>
<rect y="3" width="48" height="1" fill="${COPPER.light}"/>
<path d="M24 0L28 4L24 8L20 4Z" fill="${GOLD.dark}"/>
<path d="M24 1L27 4L24 7L21 4Z" fill="${GOLD.mid}"/>
<path d="M24 2L25.6 4L24 6L22.4 4Z" fill="${GOLD.light}"/>`,
  )
}

type Glyph = (color: string) => string

// Piktogramy do drahokamů: jen obdélníky a mnohoúhelníky (pixelartový charakter), vycentrované do 32 × 32.
const GLYPHS: Record<string, Glyph> = {
  postavy: (c) =>
    `<rect x="14" y="8" width="4" height="4" fill="${c}"/><rect x="12" y="13" width="8" height="3" fill="${c}"/><rect x="10" y="16" width="12" height="7" fill="${c}"/>`,
  druziny: (c) => `<path d="M10 8H22V17L16 24L10 17Z" fill="${c}"/>`,
  vypravy: (c) =>
    `<path d="M16 7L19 16L16 25L13 16Z" fill="${c}"/><path d="M7 16L16 13L25 16L16 19Z" fill="${c}" fill-opacity="0.85"/>`,
  ctenar: (c) =>
    `<rect x="8" y="10" width="7" height="12" fill="${c}"/><rect x="17" y="10" width="7" height="12" fill="${c}"/>`,
  bestiar: (c) =>
    `<rect x="12" y="16" width="8" height="7" fill="${c}"/><rect x="9" y="12" width="3" height="3" fill="${c}"/><rect x="13" y="9" width="3" height="4" fill="${c}"/><rect x="17" y="9" width="3" height="4" fill="${c}"/><rect x="21" y="12" width="3" height="3" fill="${c}"/>`,
  grimoar: (c) => `<path d="M14 8H18V13L23 22H9L14 13Z" fill="${c}"/>`,
  // Sluj: vchod do jeskyně (oblouk s tmavým otvorem)
  knihovna: (c) =>
    `<path fill-rule="evenodd" d="M8 24V15C8 10.5 11.5 7.5 16 7.5S24 10.5 24 15V24ZM12.5 24V17C12.5 14.8 14 13.5 16 13.5S19.5 14.8 19.5 17V24Z" fill="${c}"/>`,
}

/** Barvy drahokamů: světlý a tmavý konec přechodu a barva piktogramu. */
const GEMS: Record<string, { light: string; dark: string; glyph: string }> = {
  postavy: { light: '#e0405c', dark: '#7a0f26', glyph: '#fff1d6' }, // rubín
  druziny: { light: '#4f78e8', dark: '#1a2c78', glyph: '#fff1d6' }, // safír
  vypravy: { light: '#3fc785', dark: '#0d5a35', glyph: '#fff1d6' }, // smaragd
  ctenar: { light: '#f0a928', dark: '#8a5200', glyph: '#fff7dc' }, // topaz
  bestiar: { light: '#a65fe0', dark: '#4a1a78', glyph: '#fff1d6' }, // ametyst
  grimoar: { light: '#d4547a', dark: '#6b1535', glyph: '#fff1d6' }, // granát
  knihovna: { light: '#b9c2cf', dark: '#566070', glyph: '#1d2430' }, // stříbro
}

/** Ikona záložky: osmiboký drahokam s fasetami a piktogramem. */
export function gemIcon(moduleId: keyof typeof GEMS): string {
  const g = GEMS[moduleId]!
  const id = `g-${moduleId}`
  return svg(
    32,
    32,
    `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${g.light}"/><stop offset="1" stop-color="${g.dark}"/></linearGradient></defs>
<polygon points="9,1 23,1 31,9 31,23 23,31 9,31 1,23 1,9" fill="#0d0814"/>
<polygon points="9.5,2.5 22.5,2.5 29.5,9.5 29.5,22.5 22.5,29.5 9.5,29.5 2.5,22.5 2.5,9.5" fill="url(#${id})"/>
<polygon points="9.5,2.5 22.5,2.5 29.5,9.5 26,9.5 21,4.5 11,4.5 6,9.5 2.5,9.5" fill="#fff" fill-opacity="0.28"/>
<polygon points="29.5,22.5 22.5,29.5 9.5,29.5 2.5,22.5 6,22.5 11,27.5 21,27.5 26,22.5" fill="#000" fill-opacity="0.3"/>
${GLYPHS[moduleId]!(g.glyph)}`,
  )
}

/** Id modulů, pro které existuje ikona. */
export const ICON_MODULES = Object.keys(GEMS)
