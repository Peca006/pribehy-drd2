// Vestavěné Hávy (vzhledy aplikace): vždy dostupné, nedají se smazat a jejich `id` je vyhrazené (viz `RESERVED_IDS`).
// Jsou to obyčejné manifesty ve formátu `.drdskin` (WARDROBE.md), takže se dají v Šatníku exportovat a sloužit jako vzor
// pro vlastní Hávy. Při načtení se zvalidují stejně jako Háv ze souboru; neplatná definice je chyba programu.
import type { AssetFile } from '../core/skin/file'
import { validateSkin, type Skin } from '../core/skin/skin'
import {
  copperFrame,
  dialogFrame,
  divider,
  gemButton,
  gemIcon,
  ICON_MODULES,
  marble,
  tabRim,
  tabRimSide,
} from './podzemi/art'

const svgAsset = (name: string, source: string): AssetFile => ({
  name,
  type: 'image/svg+xml',
  bytes: new TextEncoder().encode(source),
})

const SIDE_TAB = { image: 'lem-bok', mode: 'slice', slice: [0, 6, 0, 0], edge: 'repeat', fill: false }

const MANIFEST = {
  schema: 1,
  version: '1.0.0',
  author: 'Příběhy v Dračím doupěti',
  license: 'GPL-3.0-or-later',
} as const

const definitions = [
  {
    ...MANIFEST,
    id: 'pergamen',
    name: 'Pergamen',
    scheme: 'light',
    // teplé tóny starého papíru, inkoust a oxidová červeň
    tokens: {
      '--drd-bg': '#efe3c8',
      '--drd-surface': '#f8f0dc',
      '--drd-text': '#2b2118',
      '--drd-text-muted': '#5c4a36',
      '--drd-border': '#8a7355',
      '--drd-accent': '#7b2d1a',
      '--drd-danger': '#a12a1f',
      '--drd-success': '#2f6b2a',
      '--drd-warning': '#8a5600',
      '--drd-scrim': 'rgb(40 25 10 / 0.55)',
      '--drd-shadow': '0 2px 10px rgb(60 40 10 / 0.35)',
      '--drd-radius': '6px',
      '--drd-font': "Georgia, 'Palatino Linotype', 'Book Antiqua', serif",
    },
    // telefon na šířku: málo místa na výšku, mezery se zmenší
    variants: [{ when: { low: true }, tokens: { '--drd-gap': '0.6rem' } }],
  },
  {
    ...MANIFEST,
    id: 'noc',
    name: 'Noc',
    scheme: 'dark',
    // chladná půlnoční modř a světle modrý akcent
    tokens: {
      '--drd-bg': '#0d1220',
      '--drd-surface': '#172036',
      '--drd-text': '#e6ecf7',
      '--drd-text-muted': '#9aa8c4',
      '--drd-border': '#5d6f95',
      '--drd-accent': '#7fc8ff',
      '--drd-danger': '#ff8a8a',
      '--drd-success': '#7fdc9a',
      '--drd-warning': '#f0c46a',
      '--drd-scrim': 'rgb(2 4 12 / 0.7)',
      '--drd-shadow': '0 2px 14px rgb(0 0 0 / 0.6)',
      '--drd-radius': '8px',
    },
    variants: [{ when: { low: true }, tokens: { '--drd-gap': '0.6rem' } }],
  },
  {
    ...MANIFEST,
    id: 'podzemi',
    name: 'Podzemí',
    scheme: 'dark',
    // retro PC RPG (Eye of the Beholder, Dungeon Master, Legends of Kyrandia): tmavý kámen, ametystové plochy,
    // zlatý akcent a měděné okraje, sytě „drahokamové“ stavové barvy, žádné zaoblení a tvrdý stín bez rozostření.
    // Obrázky (mramorové pozadí, měděné kování panelů, tlačítka jako drahokamy, ornamentální lišta a ikony) jsou
    // vyrobené programově v `podzemi/art.ts`; embos textu dělá stín textu.
    assets: {
      kamen: { file: 'assets/kamen.svg' },
      kovani: { file: 'assets/kovani.svg' },
      klenot: { file: 'assets/klenot.svg' },
      lem: { file: 'assets/lem.svg' },
      'lem-bok': { file: 'assets/lem-bok.svg' },
      ozdoba: { file: 'assets/ozdoba.svg' },
      okno: { file: 'assets/okno.svg' },
      ...Object.fromEntries(
        ICON_MODULES.map((m) => [`ikona-${m}`, { file: `assets/ikona-${m}.svg` }]),
      ),
    },
    roles: {
      background: { image: 'kamen', mode: 'repeat', size: 256 },
      panel: { image: 'kovani', mode: 'slice', slice: 12, width: 9, fill: false },
      button: { image: 'klenot', mode: 'slice', slice: 8, width: 5 },
      tab: { image: 'lem', mode: 'slice', slice: [6, 0, 0, 0], edge: 'repeat', fill: false },
      divider: { image: 'ozdoba', mode: 'repeat-x', size: 48, height: 8 },
      dialog: { image: 'okno', mode: 'slice', slice: 16, width: 12, fill: false },
    },
    icons: Object.fromEntries(ICON_MODULES.map((m) => [m, `ikona-${m}`])),
    tokens: {
      '--drd-text-shadow': '1px 1px 0 rgb(0 0 0 / 0.85), -1px -1px 0 rgb(255 255 255 / 0.08)',
      '--drd-bg': '#130d1c',
      '--drd-surface': '#221733',
      '--drd-text': '#f3e9d0',
      '--drd-text-muted': '#b9a98f',
      '--drd-border': '#b87333',
      '--drd-accent': '#f2c14e',
      '--drd-danger': '#ff6b7a',
      '--drd-success': '#5fe08a',
      '--drd-warning': '#ffb347',
      '--drd-scrim': 'rgb(10 4 20 / 0.75)',
      '--drd-shadow': '3px 3px 0 rgb(0 0 0 / 0.85)',
      '--drd-radius': '0px',
      '--drd-font': 'Verdana, Tahoma, "DejaVu Sans", sans-serif',
    },
    variants: [
      { when: { width: 'compact' }, tokens: { '--drd-gap': '0.75rem' } },
      { when: { low: true }, tokens: { '--drd-gap': '0.5rem' } },
      // telefon na šířku a široké okno: lišta je svislý pruh vlevo (nízký viewport nemá výšku nazbyt) s pravým lemem
      {
        when: { orientation: 'landscape', low: true },
        tokens: { '--drd-nav-position': 'left' },
        roles: { tab: SIDE_TAB },
      },
      { when: { width: 'expanded' }, tokens: { '--drd-nav-position': 'left' }, roles: { tab: SIDE_TAB } },
    ],
  },
]

function build(raw: unknown): Skin {
  const v = validateSkin(raw, { allowReserved: true })
  // vestavěný Háv musí projít bez chyb i bez varování (jinak by se nedal rozumně používat)
  if (!v.skin || v.issues.length) {
    throw new Error(`Vestavěný Háv je neplatný: ${JSON.stringify(v.issues)}`)
  }
  return v.skin
}

export const BUILTIN_SKINS: readonly Skin[] = definitions.map(build)

/** Obrázky vestavěných Hávů podle id Hávu. Jsou součástí kódu (ne samostatné soubory), takže fungují i offline. */
export const BUILTIN_ASSETS: Readonly<Record<string, readonly AssetFile[]>> = {
  podzemi: [
    svgAsset('kamen', marble()),
    svgAsset('kovani', copperFrame()),
    svgAsset('klenot', gemButton()),
    svgAsset('lem', tabRim()),
    svgAsset('lem-bok', tabRimSide()),
    svgAsset('ozdoba', divider()),
    svgAsset('okno', dialogFrame()),
    ...ICON_MODULES.map((m) => svgAsset(`ikona-${m}`, gemIcon(m))),
  ],
}
