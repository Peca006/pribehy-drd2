// Švadlena: jádro editoru Hávů (čisté funkce bez prohlížeče). Editor upravuje kopii Hávu (nikdy vestavěný) a každou
// změnu předává stejné validaci jako import souboru, takže z editoru nevznikne Háv, který by šel zneužít nebo rozbít
// aplikaci. Etapa 1: tokeny (barvy, písmo, tvary, mezery, průhlednost panelů, poloha lišty). Obrázky a varianty
// zůstávají ze zdrojového Hávu beze změny.
import { parseColor } from './color'
import { RESERVED_IDS, SKIN_SCHEMA, baseTheme, type Skin } from './skin'
import { TOKEN_SPECS, tokenValueError, type TokenName } from './tokens'

/** Skupina tokenů v editoru a jejich popisky (řazení = pořadí v rozhraní). */
export interface TokenField {
  name: TokenName
  label: string
  hint?: string
}
export interface TokenGroup {
  id: string
  title: string
  fields: TokenField[]
}

export const TOKEN_GROUPS: readonly TokenGroup[] = [
  {
    id: 'barvy',
    title: 'Barvy',
    fields: [
      { name: '--drd-bg', label: 'Pozadí stránky' },
      { name: '--drd-surface', label: 'Plocha panelů a polí' },
      { name: '--drd-text', label: 'Text' },
      { name: '--drd-text-muted', label: 'Tlumený text' },
      { name: '--drd-border', label: 'Okraje' },
      { name: '--drd-accent', label: 'Zvýraznění' },
      { name: '--drd-danger', label: 'Chyba' },
      { name: '--drd-success', label: 'Úspěch' },
      { name: '--drd-warning', label: 'Varování' },
      { name: '--drd-scrim', label: 'Zástěna za okny', hint: 'smí být průhledná, např. rgb(0 0 0 / 0.6)' },
    ],
  },
  {
    id: 'pismo',
    title: 'Písmo a stíny',
    fields: [
      { name: '--drd-font', label: 'Písmo' },
      { name: '--drd-text-shadow', label: 'Stín textu', hint: 'none, nebo například 1px 1px 0 #000' },
      { name: '--drd-shadow', label: 'Stín prvků', hint: 'none, nebo například 0 2px 8px rgb(0 0 0 / 0.5)' },
    ],
  },
  {
    id: 'tvary',
    title: 'Tvary a mezery',
    fields: [
      { name: '--drd-radius', label: 'Zaoblení rohů' },
      { name: '--drd-gap', label: 'Mezery' },
      { name: '--drd-shape-panel', label: 'Tvar panelů' },
      { name: '--drd-shape-button', label: 'Tvar tlačítek' },
      { name: '--drd-shape-dialog', label: 'Tvar oken' },
      { name: '--drd-shape-size', label: 'Velikost seříznutí' },
      { name: '--drd-panel-opacity', label: 'Průhlednost panelů', hint: 'kolik barvy panelu je vidět (zbytek propustí pozadí)' },
    ],
  },
  {
    id: 'lista',
    title: 'Hlavní lišta',
    fields: [{ name: '--drd-nav-position', label: 'Poloha lišty' }],
  },
]

export const EDITABLE_TOKENS: readonly TokenName[] = TOKEN_GROUPS.flatMap((g) => g.fields.map((f) => f.name))

/** Hodnoty nabízené v nabídce písma: obecné rodiny a běžná systémová písma (vždy s obecnou rodinou na konci). */
export const FONT_PRESETS: readonly { label: string; value: string }[] = [
  { label: 'Systémové bezpatkové', value: "system-ui, 'Segoe UI', Roboto, sans-serif" },
  { label: 'Systémové patkové', value: "Georgia, 'Times New Roman', serif" },
  { label: 'Verdana', value: 'Verdana, Tahoma, "DejaVu Sans", sans-serif' },
  { label: 'Pergamen (Palatino)', value: "'Palatino Linotype', Palatino, 'Book Antiqua', serif" },
  { label: 'Strojopis', value: "ui-monospace, 'Courier New', monospace" },
]

const MAX_NAME = 60
const MAX_ID = 40

/** Z názvu udělá část `id` (malá písmena a pomlčky, bez diakritiky). */
export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Nové `id` pro vlastní Háv: `moje-<název>`, při shodě s existujícím nebo vestavěným s číslem. Nejvýše 40 znaků. */
export function newSkinId(name: string, taken: readonly string[]): string {
  const slug = slugify(name) || 'hav'
  const base = (slug.startsWith('moje-') ? slug : `moje-${slug}`).slice(0, MAX_ID - 4).replace(/-+$/, '')
  const used = new Set<string>([...taken, ...RESERVED_IDS])
  if (!used.has(base)) return base
  for (let n = 2; n < 1000; n++) {
    const id = `${base}-${n}`
    if (!used.has(id)) return id
  }
  return `${base}-${Date.now() % 1000}`
}

/** Kopie Hávu pro úpravy: nové `id`, název a autor, verze 1.0.0; zbytek (obrázky, role, varianty) se zachová. */
export function copyForEditing(
  src: Skin,
  opts: { name: string; author: string; taken: readonly string[] },
): Skin {
  const name = opts.name.trim().slice(0, MAX_NAME) || 'Můj Háv'
  return {
    ...structuredClone(src),
    schema: SKIN_SCHEMA,
    id: newSkinId(name, opts.taken),
    name,
    version: '1.0.0',
    author: opts.author.trim().slice(0, 80) || 'neznámý autor',
    license: 'Pro vlastní potřebu',
  }
}

/** Hodnota tokenu v Hávu pro zobrazení: vlastní, jinak výchozí podle schématu. */
export function tokenValue(skin: Skin, name: TokenName): string {
  return skin.tokens[name] ?? baseTheme(skin.scheme).tokens[name] ?? ''
}

export interface TokenChange {
  skin: Skin
  /** text chyby (hodnota se nepřijala), nebo null */
  error: string | null
}

/**
 * Nastaví token. Neplatná hodnota Háv nezmění a vrátí chybu. Prázdná hodnota nebo shoda s výchozí hodnotou
 * schématu token z Hávu odstraní (Háv pak drží jen to, co skutečně mění).
 */
export function setToken(skin: Skin, name: TokenName, raw: string): TokenChange {
  const value = raw.trim()
  if (value === '') return { skin: withoutToken(skin, name), error: null }
  const error = tokenValueError(name, value)
  if (error) return { skin, error }
  if (value === baseTheme(skin.scheme).tokens[name]) return { skin: withoutToken(skin, name), error: null }
  return { skin: { ...skin, tokens: { ...skin.tokens, [name]: value } }, error: null }
}

function withoutToken(skin: Skin, name: TokenName): Skin {
  if (!(name in skin.tokens)) return skin
  const { [name]: _drop, ...tokens } = skin.tokens
  return { ...skin, tokens }
}

/** Změní schéma. Tokeny zůstávají, jen se mění výchozí hodnoty, které Háv nepřepisuje. */
export const setScheme = (skin: Skin, scheme: 'light' | 'dark'): Skin => ({ ...skin, scheme })

/** Změní metadata (název, autor, licence); nepřijatelná hodnota se ořízne na mez formátu. */
export function setMeta(
  skin: Skin,
  meta: Partial<Pick<Skin, 'name' | 'author' | 'license'>>,
): Skin {
  const out = { ...skin }
  if (meta.name !== undefined && meta.name.trim()) out.name = meta.name.trim().slice(0, MAX_NAME)
  if (meta.author !== undefined && meta.author.trim()) out.author = meta.author.trim().slice(0, 80)
  if (meta.license !== undefined && meta.license.trim()) out.license = meta.license.trim().slice(0, 120)
  return out
}

/** Barva ve tvaru `#rrggbb` pro `<input type="color">`, nebo null (průhledná či nepodporovaná). */
export function hexOf(value: string): string | null {
  const c = parseColor(value)
  if (!c || c.a < 1) return null
  const h = (n: number) => Math.round(n).toString(16).padStart(2, '0')
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`
}

/** Jaký ovládací prvek se pro token použije. */
export type FieldKind = 'color' | 'color-text' | 'font' | 'text' | 'px' | 'percent' | 'enum'

export function fieldKind(name: TokenName): FieldKind {
  const spec = TOKEN_SPECS[name]
  switch (spec.kind) {
    case 'color':
      return spec.opaque ? 'color' : 'color-text'
    case 'font':
      return 'font'
    case 'shadow':
    case 'textShadow':
      return 'text'
    case 'length':
      return 'px'
    case 'percent':
      return 'percent'
    case 'enum':
      return 'enum'
  }
}

/** Prázdný Háv se schématem (základ „od nuly“): žádný token, obrázek ani varianta, takže platí výchozí vzhled. */
export const blankSkin = (scheme: 'light' | 'dark'): Skin => ({
  schema: SKIN_SCHEMA,
  id: 'zaklad',
  name: scheme === 'light' ? 'Světlý základ' : 'Tmavý základ',
  version: '1.0.0',
  author: 'neznámý autor',
  license: 'Pro vlastní potřebu',
  scheme,
  tokens: {},
  variants: [],
  assets: {},
  roles: {},
  icons: {},
  ornaments: [],
})

/** Čeština pro hodnoty výčtových tokenů. */
export const ENUM_LABELS: Readonly<Record<string, string>> = {
  bottom: 'Dole',
  top: 'Nahoře',
  left: 'Svislý pruh vlevo',
  right: 'Svislý pruh vpravo',
  rect: 'Obdélník',
  chamfer: 'Seříznuté čtyři rohy',
  notch: 'Seříznuté dva rohy',
}

/** Hodnoty výčtového tokenu (jinak prázdný seznam). */
export function enumValues(name: TokenName): readonly string[] {
  const spec = TOKEN_SPECS[name]
  return spec.kind === 'enum' ? spec.values : []
}

/** Meze číselného tokenu (px nebo procenta), jinak null. */
export function fieldRange(name: TokenName): { min: number; max: number } | null {
  const spec = TOKEN_SPECS[name]
  return spec.kind === 'length' || spec.kind === 'percent' ? { min: spec.min, max: spec.max } : null
}
