// Háv (skin): manifest, validace komunitního vstupu, třídy viewportu a skládání variant.
// Formát je popsán ve WARDROBE.md. Nic tu nesahá na DOM; do aplikace se Háv dostane přes `skinTheme` + `applyTheme`.
import type { Theme, ThemeTokens } from '../theme'
import { darkTheme, lightTheme } from '../../themes/default'
import { contrastRatio, parseColor } from './color'
import {
  mergeRoles,
  roleVariables,
  rolesImages,
  validateRoles,
  type RoleOverrides,
  type Roles,
} from './roles'
import { shapeVariables } from './shape'
import { isTokenName, tokenValueError, type TokenName } from './tokens'
import { isSafeZipName } from './zip'

export const SKIN_SCHEMA = 1
export const SKIN_EXTENSION = '.drdskin'
export const MAX_MANIFEST_BYTES = 64 * 1024
export const MAX_VARIANTS = 16
export const MAX_ASSETS = 32
export const ASSET_DIR = 'assets/'
/** id výchozích skinů a vestavěných Hávů (`src/themes/havy.ts`); Háv ze souboru je nesmí zastínit */
export const RESERVED_IDS = [
  'system',
  'default-dark',
  'default-light',
  'pergamen',
  'noc',
  'podzemi',
] as const

export type WidthClass = 'compact' | 'medium' | 'expanded'
export type Orientation = 'portrait' | 'landscape'

export interface Viewport {
  width: WidthClass
  orientation: Orientation
  /** nízký viewport (výška < 480 px), typicky telefon na šířku */
  low: boolean
}

export interface VariantWhen {
  width?: WidthClass
  orientation?: Orientation
  low?: boolean
}

export interface SkinVariant {
  when: VariantWhen
  tokens: Partial<Record<TokenName, string>>
  /** role, které varianta nahrazuje (`null` roli vypne) */
  roles?: RoleOverrides
}

/** Obrázek v souboru Hávu: cesta v archivu (vždy pod `assets/`). Bajty jsou mimo manifest. */
export interface AssetRef {
  file: string
}
export type Assets = Record<string, AssetRef>

export interface Skin {
  schema: typeof SKIN_SCHEMA
  id: string
  name: string
  version: string
  author: string
  license: string
  scheme: 'light' | 'dark'
  minApp?: string
  tokens: Partial<Record<TokenName, string>>
  variants: SkinVariant[]
  /** obrázky podle názvu (viz `assets/` v archivu) */
  assets: Assets
  /** role prvků s obrázky (pozadí, panel, tlačítko, záložky, dělicí čára) */
  roles: Roles
  /** ikony záložek: id modulu → název obrázku */
  icons: Record<string, string>
  iconStyle?: { pixelated: boolean }
}

export interface SkinIssue {
  level: 'error' | 'warning'
  /** cesta v manifestu, např. `tokens.--drd-bg` nebo `variants[1].when` */
  path: string
  message: string
}

export interface SkinValidation {
  /** true, když nejsou žádné chyby (varování nevadí) */
  ok: boolean
  /** vyčištěný Háv; jen když je `ok` */
  skin: Skin | null
  issues: SkinIssue[]
}

export function classifyViewport(width: number, height: number): Viewport {
  return {
    width: width < 600 ? 'compact' : width <= 1000 ? 'medium' : 'expanded',
    orientation: width > height ? 'landscape' : 'portrait',
    low: height < 480,
  }
}

const WIDTHS: WidthClass[] = ['compact', 'medium', 'expanded']
const ORIENTATIONS: Orientation[] = ['portrait', 'landscape']

export const ALL_VIEWPORTS: Viewport[] = WIDTHS.flatMap((width) =>
  ORIENTATIONS.flatMap((orientation) => [false, true].map((low) => ({ width, orientation, low }))),
)

export const viewportLabel = (v: Viewport): string =>
  `${{ compact: 'úzký', medium: 'střední', expanded: 'široký' }[v.width]}, ${v.orientation === 'portrait' ? 'na výšku' : 'na šířku'}${v.low ? ', nízký' : ''}`

const matches = (when: VariantWhen, v: Viewport) =>
  (when.width === undefined || when.width === v.width) &&
  (when.orientation === undefined || when.orientation === v.orientation) &&
  (when.low === undefined || when.low === v.low)

export const baseTheme = (scheme: 'light' | 'dark'): Theme =>
  scheme === 'light' ? lightTheme : darkTheme

/** Úplná sada tokenů Hávu pro viewport: výchozí skin schématu, přepsaný tokeny Hávu a odpovídajícími variantami (v pořadí). */
export function resolveTokens(skin: Skin, viewport: Viewport): ThemeTokens {
  const out: ThemeTokens = { ...baseTheme(skin.scheme).tokens, ...skin.tokens }
  for (const variant of skin.variants)
    if (matches(variant.when, viewport)) Object.assign(out, variant.tokens)
  return out
}

/** Role Hávu pro viewport (varianty mohou role nahradit nebo vypnout). */
export function resolveRoles(skin: Skin, viewport: Viewport): Roles {
  return mergeRoles(
    skin.roles,
    skin.variants.filter((v) => v.roles && matches(v.when, viewport)).map((v) => v.roles!),
  )
}

/**
 * Háv jako `Theme` pro `applyTheme`. `assetUrls` jsou adresy obrázků (název → `blob:`), které vyrobila aplikace;
 * bez nich (obrázky se ještě nenačetly) se použijí jen barvy.
 */
export function skinTheme(
  skin: Skin,
  viewport: Viewport,
  assetUrls: Readonly<Record<string, string>> = {},
): Theme {
  const tokens = resolveTokens(skin, viewport)
  return {
    id: skin.id,
    name: skin.name,
    scheme: skin.scheme,
    tokens: {
      ...tokens,
      ...roleVariables(resolveRoles(skin, viewport), assetUrls),
      ...shapeVariables(tokens),
    },
  }
}

/** Všechny názvy obrázků, které Háv používá (role, varianty, ikony). */
export function usedAssets(skin: Skin): Set<string> {
  return new Set([
    ...rolesImages(skin.roles),
    ...skin.variants.flatMap((v) => (v.roles ? rolesImages(v.roles) : [])),
    ...Object.values(skin.icons),
  ])
}

// --- kontrast -------------------------------------------------------------------------------------------------

interface Pair {
  fg: TokenName
  bg: 'bg' | 'surface'
  /** pod tuto mez je Háv chybný (nedá se aktivovat) */
  min: number
  /** pod tuto mez jen varování */
  warn: number
}

const bgs = ['bg', 'surface'] as const
const textPair = (fg: TokenName): Pair[] => bgs.map((bg) => ({ fg, bg, min: 3, warn: 4.5 }))
const PAIRS: Pair[] = [
  ...textPair('--drd-text'),
  ...textPair('--drd-text-muted'),
  ...textPair('--drd-accent'),
  ...textPair('--drd-danger'),
  ...textPair('--drd-success'),
  ...textPair('--drd-warning'),
  // okraje nejsou text: stačí slabší kontrast
  ...bgs.map((bg) => ({ fg: '--drd-border' as const, bg, min: 1.5, warn: 3 })),
]

const bgToken = (bg: Pair['bg']): TokenName => (bg === 'bg' ? '--drd-bg' : '--drd-surface')

/** Kontrast pro každý viewport (po sloučení variant); shodné výsledky se hlásí jen jednou. */
export function contrastIssues(skin: Skin): SkinIssue[] {
  const issues: SkinIssue[] = []
  const seen = new Set<string>()
  const done = new Set<string>()
  for (const viewport of ALL_VIEWPORTS) {
    const tokens = resolveTokens(skin, viewport)
    const sig = JSON.stringify(tokens)
    if (done.has(sig)) continue
    done.add(sig)
    for (const p of PAIRS) {
      const fg = parseColor(tokens[p.fg]!)
      const bg = parseColor(tokens[bgToken(p.bg)]!)
      if (!fg || !bg) continue
      const ratio = contrastRatio(fg, bg)
      if (ratio >= p.warn) continue
      const level = ratio < p.min ? 'error' : 'warning'
      const key = `${p.fg}|${p.bg}|${level}|${ratio.toFixed(1)}`
      if (seen.has(key)) continue
      seen.add(key)
      issues.push({
        level,
        path: `tokens.${p.fg}`,
        message: `kontrast ${p.fg.slice(6)} na ${p.bg === 'bg' ? 'pozadí' : 'ploše'} je ${ratio.toFixed(1)}:1${
          // označení viewportu má smysl jen tam, kde se vzhled podle něj mění
          skin.variants.length ? ` (${viewportLabel(viewport)})` : ''
        }; ${
          level === 'error'
            ? `minimum je ${p.min}:1, Háv nelze aktivovat`
            : `doporučeno aspoň ${p.warn}:1`
        }`,
      })
    }
  }
  return issues
}

// --- validace manifestu ---------------------------------------------------------------------------------------

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/
const SEMVER = /^(\d{1,4})\.(\d{1,5})\.(\d{1,6})$/
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f]/
const TOP_KEYS = new Set([
  'schema',
  'id',
  'name',
  'version',
  'author',
  'license',
  'scheme',
  'minApp',
  'tokens',
  'variants',
  'assets',
  'roles',
  'icons',
  'iconStyle',
])

const ASSET_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/
const ICON_KEY = /^[a-z0-9]+(-[a-z0-9]+)*$/

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const parseSemver = (s: string): [number, number, number] | null => {
  const m = SEMVER.exec(s)
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null
}

function olderThan(a: [number, number, number], b: [number, number, number]): boolean {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i]! < b[i]!
  return false
}

export interface ValidateOptions {
  /** verze aplikace pro kontrolu `minApp` */
  appVersion?: string
  /** povolit vyhrazená id (jen pro vestavěné Hávy, které si aplikace validuje sama) */
  allowReserved?: boolean
}

export function validateSkin(raw: unknown, options: ValidateOptions = {}): SkinValidation {
  const issues: SkinIssue[] = []
  const error = (path: string, message: string) => issues.push({ level: 'error', path, message })
  const warn = (path: string, message: string) => issues.push({ level: 'warning', path, message })
  const fail = (): SkinValidation => ({ ok: false, skin: null, issues })

  if (!isObject(raw)) {
    error('', 'manifest musí být objekt')
    return fail()
  }
  for (const key of Object.keys(raw))
    if (!TOP_KEYS.has(key)) warn(key, 'neznámá položka se ignoruje')

  if (raw.schema !== SKIN_SCHEMA) {
    error(
      'schema',
      raw.schema === undefined
        ? 'chybí verze formátu (schema)'
        : `nepodporovaná verze formátu: ${String(raw.schema)}`,
    )
    return fail()
  }

  const text = (key: string, max: number, required = true): string => {
    const v = raw[key]
    if (v === undefined && !required) return ''
    if (typeof v !== 'string' || v.trim() === '') {
      error(key, 'povinný text')
      return ''
    }
    if (v.length > max || CONTROL.test(v)) {
      error(key, `nejvýše ${max} znaků a bez řídicích znaků`)
      return ''
    }
    return v.trim()
  }

  const id = text('id', 40)
  if (id && !ID.test(id)) error('id', 'jen malá písmena, číslice a pomlčky (např. pergamen-noc)')
  else if (!options.allowReserved && (RESERVED_IDS as readonly string[]).includes(id))
    error('id', `id „${id}“ patří vestavěnému vzhledu; v manifestu zvolte jiné id`)
  const name = text('name', 60)
  const version = text('version', 20)
  if (version && !SEMVER.test(version)) error('version', 'verze ve tvaru x.y.z')
  const author = text('author', 80)
  const license = text('license', 120)

  const scheme = raw.scheme === 'light' || raw.scheme === 'dark' ? raw.scheme : null
  if (!scheme) error('scheme', 'musí být „light“ nebo „dark“')

  let minApp: string | undefined
  if (raw.minApp !== undefined) {
    const need = typeof raw.minApp === 'string' ? parseSemver(raw.minApp) : null
    if (!need) error('minApp', 'verze ve tvaru x.y.z')
    else {
      minApp = raw.minApp as string
      const have = options.appVersion ? parseSemver(options.appVersion) : null
      if (have && olderThan(have, need))
        error('minApp', `Háv vyžaduje aplikaci ${minApp} nebo novější`)
    }
  }

  const checkTokens = (path: string, value: unknown): Partial<Record<TokenName, string>> => {
    const out: Partial<Record<TokenName, string>> = {}
    if (value === undefined) return out
    if (!isObject(value)) {
      error(path, 'tokeny musí být objekt')
      return out
    }
    for (const [key, v] of Object.entries(value)) {
      if (!isTokenName(key)) {
        warn(`${path}.${key}`, 'neznámý token se ignoruje')
        continue
      }
      const problem = tokenValueError(key, v)
      if (problem) error(`${path}.${key}`, problem)
      else out[key] = (v as string).trim()
    }
    return out
  }

  const tokens = checkTokens('tokens', raw.tokens)

  // obrázky (jen odkazy na soubory v archivu; samotný obsah kontroluje `readSkinFile`)
  const assets: Assets = {}
  if (raw.assets !== undefined) {
    if (!isObject(raw.assets))
      error('assets', 'obrázky musí být objekt (název → { "file": "assets/…" })')
    else {
      const entries = Object.entries(raw.assets)
      if (entries.length > MAX_ASSETS) error('assets', `nejvýše ${MAX_ASSETS} obrázků`)
      for (const [key, ref] of entries.slice(0, MAX_ASSETS)) {
        const path = `assets.${key}`
        if (key.length > 32 || !ASSET_NAME.test(key))
          error(path, 'název obrázku: malá písmena, číslice a pomlčky, nejvýše 32 znaků')
        else if (!isObject(ref) || typeof ref.file !== 'string')
          error(path, 'chybí soubor, např. { "file": "assets/mramor.svg" }')
        else if (!ref.file.startsWith(ASSET_DIR) || !isSafeZipName(ref.file))
          error(
            `${path}.file`,
            'cesta musí být pod assets/ a obsahovat jen písmena, číslice, tečku, pomlčku a podtržítko',
          )
        else assets[key] = { file: ref.file }
      }
    }
  }
  const assetNames = new Set(Object.keys(assets))
  const report = (level: 'error' | 'warning', path: string, message: string) =>
    issues.push({ level, path, message })

  const roles = validateRoles(raw.roles, 'roles', assetNames, report) as Roles

  const icons: Record<string, string> = {}
  if (raw.icons !== undefined) {
    if (!isObject(raw.icons)) error('icons', 'ikony musí být objekt (id modulu → název obrázku)')
    else {
      const entries = Object.entries(raw.icons)
      if (entries.length > MAX_ASSETS) error('icons', `nejvýše ${MAX_ASSETS} ikon`)
      for (const [key, value] of entries.slice(0, MAX_ASSETS)) {
        if (key.length > 30 || !ICON_KEY.test(key))
          warn(`icons.${key}`, 'neplatné id modulu, ikona se ignoruje')
        else if (typeof value !== 'string' || !assetNames.has(value))
          error(`icons.${key}`, 'chybí obrázek (název z assets)')
        else icons[key] = value
      }
    }
  }

  let iconStyle: Skin['iconStyle']
  if (raw.iconStyle !== undefined) {
    if (
      !isObject(raw.iconStyle) ||
      (raw.iconStyle.pixelated !== undefined && typeof raw.iconStyle.pixelated !== 'boolean')
    )
      error('iconStyle', 'očekává se { "pixelated": true | false }')
    else iconStyle = { pixelated: raw.iconStyle.pixelated === true }
  }

  const variants: SkinVariant[] = []
  if (raw.variants !== undefined) {
    if (!Array.isArray(raw.variants)) error('variants', 'varianty musí být pole')
    else {
      if (raw.variants.length > MAX_VARIANTS) error('variants', `nejvýše ${MAX_VARIANTS} variant`)
      raw.variants.slice(0, MAX_VARIANTS).forEach((v: unknown, i) => {
        const path = `variants[${i}]`
        if (!isObject(v)) return error(path, 'varianta musí být objekt')
        const when: VariantWhen = {}
        if (!isObject(v.when)) error(`${path}.when`, 'chybí podmínka (when)')
        else {
          for (const [k, val] of Object.entries(v.when)) {
            if (k === 'width' && (WIDTHS as unknown[]).includes(val)) when.width = val as WidthClass
            else if (k === 'orientation' && (ORIENTATIONS as unknown[]).includes(val))
              when.orientation = val as Orientation
            else if (k === 'low' && typeof val === 'boolean') when.low = val
            else if (['width', 'orientation', 'low'].includes(k))
              error(`${path}.when.${k}`, 'nepovolená hodnota')
            else warn(`${path}.when.${k}`, 'neznámá podmínka se ignoruje')
          }
          if (Object.keys(when).length === 0)
            error(`${path}.when`, 'podmínka musí obsahovat width, orientation nebo low')
        }
        const variant: SkinVariant = { when, tokens: checkTokens(`${path}.tokens`, v.tokens) }
        if (v.roles !== undefined)
          variant.roles = validateRoles(v.roles, `${path}.roles`, assetNames, report, true)
        variants.push(variant)
      })
    }
  }

  if (!scheme || issues.some((i) => i.level === 'error')) return fail()

  const skin: Skin = {
    schema: SKIN_SCHEMA,
    id,
    name,
    version,
    author,
    license,
    scheme,
    tokens,
    variants,
    assets,
    roles,
    icons,
  }
  if (iconStyle) skin.iconStyle = iconStyle
  if (minApp) skin.minApp = minApp
  const used = usedAssets(skin)
  for (const name of assetNames)
    if (!used.has(name))
      warn(`assets.${name}`, 'obrázek se nepoužívá (žádná role ani ikona ho neodkazuje)')
  issues.push(...contrastIssues(skin))
  const ok = !issues.some((i) => i.level === 'error')
  return { ok, skin: ok ? skin : null, issues }
}
