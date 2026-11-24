// Role prvků (milník 2): Háv může dát obrázek pozadí, panelům, tlačítkům, spodní liště záložek, dělicí čáře a oknům (dialogům).
// Role se vždy převádí na CSS proměnné (`--drd-<role>-…`), které čtou globální styly v `app.css`; bez obrázku proměnné
// nejsou a vzhled je dán jen barevnými tokeny. Do CSS se nikdy nevkládá text z manifestu, jen ověřená čísla,
// pevná klíčová slova a adresa obrázku, kterou vyrobila aplikace (`blob:`).
import type { ThemeTokens } from '../theme'

export const ROLE_NAMES = ['background', 'panel', 'button', 'tab', 'divider', 'dialog'] as const
export type RoleName = (typeof ROLE_NAMES)[number]

export const ROLE_MODES = [
  'stretch', // roztažení na celou plochu (poměr se nezachovává)
  'contain', // celý obrázek, poměr se zachová
  'cover', // vyplní celou plochu, poměr se zachová (okraj se může oříznout)
  'repeat', // dlaždice v obou osách
  'repeat-x', // dlaždice vodorovně
  'repeat-y', // dlaždice svisle
  'slice', // devítidílný rámeček: rohy se nemění, strany se opakují/roztahují (border-image)
] as const
export type RoleMode = (typeof ROLE_MODES)[number]

export const ROLE_POSITIONS = [
  'center',
  'top',
  'bottom',
  'left',
  'right',
  'top left',
  'top right',
  'bottom left',
  'bottom right',
] as const
export type RolePosition = (typeof ROLE_POSITIONS)[number]

/** Strany devítidílného rámečku: roztažení, opakování, opakování s úpravou velikosti, opakování s mezerami. */
export const ROLE_EDGES = ['stretch', 'repeat', 'round', 'space'] as const
export type RoleEdge = (typeof ROLE_EDGES)[number]

/** Čtyři hodnoty ve směru hodinových ručiček: nahoře, vpravo, dole, vlevo. */
export type Sides = [number, number, number, number]

export interface Role {
  /** název obrázku z `assets` */
  image: string
  mode: RoleMode
  /** šířka dlaždice v px u režimů `repeat*` (výška podle poměru); jinak se ignoruje */
  size?: number
  position?: RolePosition
  /** `slice`: okraje zdrojového obrázku v jeho pixelech (nahoře, vpravo, dole, vlevo) */
  slice?: Sides
  /** `slice`: tloušťka rámečku na obrazovce v px; výchozí je shodná s `slice` (obrázek se nezvětšuje) */
  width?: Sides
  /** `slice`: vyplnit střed obrázkem (výchozí ano) */
  fill?: boolean
  /** `slice`: jak se vyplní strany rámečku mezi rohy (výchozí `stretch`) */
  edge?: RoleEdge
  /** jen u role `divider`: výška dělicí čáry v px (výchozí 0, tedy jen ohraničení z `slice`) */
  height?: number
  /** pixelart: ostré zvětšení bez vyhlazení; jen u role `background` (u ostatních by se přenášelo na vnitřní obrázky) */
  pixelated?: boolean
}

export type Roles = Partial<Record<RoleName, Role>>
/** Varianta může roli nahradit jinou, nebo vypnout (`null`). */
export type RoleOverrides = Partial<Record<RoleName, Role | null>>

export const MAX_SLICE = 2048
export const MAX_BORDER_WIDTH = 64
export const MAX_TILE = 2048
export const MAX_DIVIDER_HEIGHT = 512

const ROLE_KEYS = [
  'image',
  'mode',
  'size',
  'position',
  'slice',
  'width',
  'fill',
  'edge',
  'height',
  'pixelated',
]

export const isRoleName = (name: string): name is RoleName =>
  (ROLE_NAMES as readonly string[]).includes(name)

type Report = (level: 'error' | 'warning', path: string, message: string) => void

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

function sides(value: unknown, max: number): Sides | null {
  const arr = typeof value === 'number' ? [value, value, value, value] : value
  if (!Array.isArray(arr) || arr.length !== 4) return null
  if (!arr.every((n) => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= max))
    return null
  return arr as Sides
}

/** Ověří jednu roli; vrátí vyčištěnou roli, nebo null (chyby jsou ohlášeny). */
export function validateRole(
  raw: unknown,
  path: string,
  assetNames: ReadonlySet<string>,
  report: Report,
): Role | null {
  if (!isObject(raw)) {
    report('error', path, 'role musí být objekt')
    return null
  }
  let ok = true
  const bad = (field: string, message: string) => {
    report('error', `${path}.${field}`, message)
    ok = false
  }
  for (const key of Object.keys(raw)) {
    if (!ROLE_KEYS.includes(key)) {
      report('warning', `${path}.${key}`, 'neznámá položka se ignoruje')
    }
  }

  const image = raw.image
  if (typeof image !== 'string' || !assetNames.has(image))
    bad('image', 'chybí obrázek (název z assets)')

  const mode = raw.mode
  if (typeof mode !== 'string' || !(ROLE_MODES as readonly string[]).includes(mode)) {
    bad('mode', `režim musí být jeden z: ${ROLE_MODES.join(', ')}`)
  }
  if (!ok) return null

  const role: Role = { image: image as string, mode: mode as RoleMode }

  if (raw.size !== undefined) {
    const s = raw.size
    if (typeof s !== 'number' || !Number.isInteger(s) || s < 1 || s > MAX_TILE)
      bad('size', `celé číslo 1 až ${MAX_TILE}`)
    else if (!role.mode.startsWith('repeat'))
      report(
        'warning',
        `${path}.size`,
        'velikost se používá jen u režimů repeat, repeat-x a repeat-y',
      )
    else role.size = s
  }
  if (raw.position !== undefined) {
    if (
      typeof raw.position !== 'string' ||
      !(ROLE_POSITIONS as readonly string[]).includes(raw.position)
    ) {
      bad('position', `jedna z hodnot: ${ROLE_POSITIONS.join(', ')}`)
    } else role.position = raw.position as RolePosition
  }
  if (role.mode === 'slice') {
    const s = sides(raw.slice, MAX_SLICE)
    if (!s)
      bad(
        'slice',
        `u režimu slice povinné: celé číslo, nebo čtyři celá čísla 0 až ${MAX_SLICE} (nahoře, vpravo, dole, vlevo)`,
      )
    else role.slice = s
    if (raw.width !== undefined) {
      const w = sides(raw.width, MAX_BORDER_WIDTH)
      if (!w) bad('width', `celé číslo, nebo čtyři celá čísla 0 až ${MAX_BORDER_WIDTH}`)
      else role.width = w
    }
    if (raw.fill !== undefined) {
      if (typeof raw.fill !== 'boolean') bad('fill', 'musí být true nebo false')
      else role.fill = raw.fill
    }
    if (raw.edge !== undefined) {
      if (typeof raw.edge !== 'string' || !(ROLE_EDGES as readonly string[]).includes(raw.edge)) {
        bad('edge', `jedna z hodnot: ${ROLE_EDGES.join(', ')}`)
      } else role.edge = raw.edge as RoleEdge
    }
  } else {
    for (const f of ['slice', 'width', 'fill', 'edge'])
      if (raw[f] !== undefined) report('warning', `${path}.${f}`, 'používá se jen u režimu slice')
  }
  if (raw.height !== undefined) {
    const h = raw.height
    if (typeof h !== 'number' || !Number.isInteger(h) || h < 1 || h > MAX_DIVIDER_HEIGHT) {
      bad('height', `celé číslo 1 až ${MAX_DIVIDER_HEIGHT}`)
    } else role.height = h
  }
  if (raw.pixelated !== undefined) {
    if (typeof raw.pixelated !== 'boolean') bad('pixelated', 'musí být true nebo false')
    else role.pixelated = raw.pixelated
  }
  return ok ? role : null
}

/** Ověří mapu rolí (`allowNull`: ve variantě smí být role `null`, tedy vypnutá). */
export function validateRoles(
  raw: unknown,
  path: string,
  assetNames: ReadonlySet<string>,
  report: Report,
  allowNull = false,
): RoleOverrides {
  const out: RoleOverrides = {}
  if (raw === undefined) return out
  if (!isObject(raw)) {
    report('error', path, 'role musí být objekt')
    return out
  }
  for (const [name, value] of Object.entries(raw)) {
    if (!isRoleName(name)) {
      report(
        'warning',
        `${path}.${name}`,
        `neznámá role se ignoruje (známé: ${ROLE_NAMES.join(', ')})`,
      )
      continue
    }
    if (value === null && allowNull) {
      out[name] = null
      continue
    }
    const role = validateRole(value, `${path}.${name}`, assetNames, report)
    if (role && role.height !== undefined && name !== 'divider') {
      report('warning', `${path}.${name}.height`, 'výška se používá jen u role divider')
      delete role.height
    }
    if (role) out[name] = role
  }
  return out
}

/** Role pro viewport: základní role Hávu, přepsané (nebo vypnuté) rolemi odpovídajících variant. */
export function mergeRoles(base: Roles, overrides: RoleOverrides[]): Roles {
  const out: Roles = { ...base }
  for (const o of overrides) {
    for (const [name, role] of Object.entries(o) as [RoleName, Role | null | undefined][]) {
      if (role === null) delete out[name]
      else if (role) out[name] = role
    }
  }
  return out
}

/** Názvy obrázků, které role používají. */
export const rolesImages = (roles: RoleOverrides): string[] =>
  Object.values(roles).flatMap((r) => (r ? [r.image] : []))

const SAFE_URL = /^[A-Za-z][A-Za-z0-9+.-]*:[^\s"'\\()]*$/

const px = (s: Sides) => s.map((n) => `${n}px`).join(' ')

/**
 * Role převede na CSS proměnné. `urls` jsou adresy obrázků vyrobené aplikací (`blob:`); role bez adresy se vynechá.
 * Pro každou roli vznikne buď sada `--drd-<role>-image|size|repeat|position` (pozadí), nebo `-bi-source|slice|width`
 * a `-bw` (rámeček z obrázku). `--drd-background-render` je `pixelated`, nebo `auto`.
 */
export function roleVariables(roles: Roles, urls: Readonly<Record<string, string>>): ThemeTokens {
  const out: ThemeTokens = {}
  for (const name of ROLE_NAMES) {
    const role = roles[name]
    const url = role ? urls[role.image] : undefined
    if (!role || !url || !SAFE_URL.test(url)) continue
    const p = `--drd-${name}` as const
    const image = `url("${url}")`
    if (role.mode === 'slice') {
      const slice = role.slice ?? [0, 0, 0, 0]
      const width = role.width ?? slice
      out[`${p}-bi-source`] = image
      out[`${p}-bi-slice`] = `${slice.join(' ')}${role.fill === false ? '' : ' fill'}`
      out[`${p}-bi-width`] = px(width)
      out[`${p}-bi-repeat`] = role.edge ?? 'stretch'
      out[`${p}-bw`] = px(width)
      if (role.height) out[`${p}-height`] = `${role.height}px`
      continue
    }
    out[`${p}-image`] = image
    // dělicí čára z obrázku nahrazuje výchozí tenkou linku (u rámečku si šířku nastavuje `-bw`)
    if (name === 'divider') out['--drd-divider-bw'] = '0'
    const repeating = role.mode.startsWith('repeat')
    out[`${p}-size`] =
      role.mode === 'stretch'
        ? '100% 100%'
        : role.mode === 'contain' || role.mode === 'cover'
          ? role.mode
          : role.size
            ? `${role.size}px auto`
            : 'auto'
    out[`${p}-repeat`] = repeating ? role.mode : 'no-repeat'
    out[`${p}-position`] = role.position ?? (repeating ? '0 0' : 'center')
    if (role.height) out[`${p}-height`] = `${role.height}px`
    if (name === 'background')
      out['--drd-background-render'] = role.pixelated ? 'pixelated' : 'auto'
  }
  return out
}
