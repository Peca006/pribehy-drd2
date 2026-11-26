// Švadlena, etapa 2: obrázky, role, ikony záložek a ozdoby v editoru (čisté funkce bez prohlížeče). Obrázek z počítače
// je stejně nedůvěryhodný jako obrázek v cizím souboru `.drdskin`, takže prochází stejnou kontrolou (`inspectImage`:
// typ podle obsahu, rozměry, SVG bez skriptů a cizích odkazů) a stejnými mezemi (počet, velikost, součet pixelů).
// Role a ozdoby se ověřují týmiž funkcemi jako při importu; neplatná změna Háv nezmění a vrátí důvod.
import { MAX_ASSET_BYTES, MAX_SKIN_FILE_BYTES, MAX_TOTAL_PIXELS, type AssetFile } from './file'
import { inspectImage } from './image'
import { validateOrnaments, MAX_ORNAMENTS, type Ornament } from './ornaments'
import { validateRoles, type Role, type RoleName, type RoleOverrides } from './roles'
import { ASSET_DIR, MAX_ASSETS, type Skin } from './skin'
import { slugify } from './editor'

const MAX_NAME = 32

export interface Change<T = Skin> {
  skin: T
  /** text chyby (změna se neprovedla), nebo null */
  error: string | null
}

const EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
}

/** Součty pro zobrazení a kontrolu mezí: počet, bajty a pixely rastrových obrázků. */
export function assetStats(assets: readonly AssetFile[]) {
  return {
    count: assets.length,
    bytes: assets.reduce((n, a) => n + a.bytes.length, 0),
    pixels: assets.reduce((n, a) => n + (a.width ?? 0) * (a.height ?? 0), 0),
  }
}

/** Text chyby, když obrázky překračují meze formátu (jinak null). */
export function assetLimitError(assets: readonly AssetFile[]): string | null {
  const s = assetStats(assets)
  if (s.count > MAX_ASSETS) return `Háv může mít nejvýše ${MAX_ASSETS} obrázků.`
  if (s.pixels > MAX_TOTAL_PIXELS)
    return `Obrázky mají dohromady příliš mnoho pixelů (nejvýše ${Math.round(MAX_TOTAL_PIXELS / 1e6)} milionů).`
  if (s.bytes > MAX_SKIN_FILE_BYTES - 256 * 1024)
    return `Obrázky jsou dohromady příliš velké (soubor Hávu smí mít ${MAX_SKIN_FILE_BYTES / 1024 / 1024} MB).`
  return null
}

/** Název obrázku z názvu souboru: malá písmena, číslice a pomlčky, nejvýše 32 znaků, v rámci Hávu jedinečný. */
export function assetNameFor(fileName: string, taken: readonly string[]): string {
  const base = fileName.replace(/\.[^.]*$/, '')
  const root = slugify(base).slice(0, MAX_NAME - 4).replace(/-+$/, '') || 'obrazek'
  const used = new Set(taken)
  if (!used.has(root)) return root
  for (let n = 2; n < 1000; n++) {
    const name = `${root}-${n}`
    if (!used.has(name)) return name
  }
  return `${root}-${Date.now() % 1000}`
}

export interface AddResult {
  skin: Skin
  assets: AssetFile[]
  name: string
  error: string | null
}

/** Přidá obrázek. Neplatný obrázek nebo překročení mezí Háv nezmění a vrátí důvod. */
export function addAsset(
  skin: Skin,
  assets: readonly AssetFile[],
  fileName: string,
  bytes: Uint8Array,
): AddResult {
  const none = (error: string): AddResult => ({ skin, assets: [...assets], name: '', error })
  if (bytes.length > MAX_ASSET_BYTES)
    return none(`Obrázek je větší než ${MAX_ASSET_BYTES / 1024 / 1024} MB.`)
  if (Object.keys(skin.assets).length >= MAX_ASSETS)
    return none(`Háv může mít nejvýše ${MAX_ASSETS} obrázků.`)
  const check = inspectImage(bytes)
  if (!check.ok) return none(`${fileName}: ${check.error}`)
  const name = assetNameFor(fileName, Object.keys(skin.assets))
  const file: AssetFile = {
    name,
    type: check.info.type,
    bytes,
    width: check.info.width,
    height: check.info.height,
  }
  const nextAssets = [...assets, file]
  const limit = assetLimitError(nextAssets)
  if (limit) return none(limit)
  return {
    skin: { ...skin, assets: { ...skin.assets, [name]: { file: `${ASSET_DIR}${name}.${EXT[file.type]}` } } },
    assets: nextAssets,
    name,
    error: null,
  }
}

/** Kde se obrázek používá (popisky pro rozhraní). */
export function usesOf(skin: Skin, name: string): string[] {
  const out: string[] = []
  for (const [r, role] of Object.entries(skin.roles)) if (role?.image === name) out.push(`role ${r}`)
  skin.variants.forEach((v, i) => {
    for (const [r, role] of Object.entries(v.roles ?? {})) if (role?.image === name) out.push(`role ${r} (varianta ${i + 1})`)
  })
  for (const [m, a] of Object.entries(skin.icons)) if (a === name) out.push(`ikona ${m}`)
  skin.ornaments.forEach((o, i) => o.image === name && out.push(`ozdoba ${i + 1}`))
  return out
}

/** Odebere obrázek i všechna místa, která ho používají (role, varianty, ikony, ozdoby). */
export function removeAsset(skin: Skin, assets: readonly AssetFile[], name: string): { skin: Skin; assets: AssetFile[] } {
  const { [name]: _drop, ...rest } = skin.assets
  const dropRoles = (roles: RoleOverrides) =>
    Object.fromEntries(Object.entries(roles).filter(([, r]) => !(r && r.image === name))) as RoleOverrides
  return {
    skin: {
      ...skin,
      assets: rest,
      roles: dropRoles(skin.roles) as Skin['roles'],
      variants: skin.variants.map((v) => (v.roles ? { ...v, roles: dropRoles(v.roles) } : v)),
      icons: Object.fromEntries(Object.entries(skin.icons).filter(([, a]) => a !== name)),
      ornaments: skin.ornaments.filter((o) => o.image !== name),
    },
    assets: assets.filter((a) => a.name !== name),
  }
}

function firstError(check: (report: (level: 'error' | 'warning', path: string, msg: string) => void) => void): string | null {
  let error: string | null = null
  check((level, path, message) => {
    if (level === 'error' && !error) error = path ? `${path.replace(/^[a-z]+\./i, '')}: ${message}` : message
  })
  return error
}

/** Nastaví roli, nebo ji vypne (`null`). Role se ověřuje jako při importu (včetně povinné výšky záhlaví). */
export function setRole(skin: Skin, name: RoleName, role: Role | null): Change {
  if (role === null) {
    const { [name]: _drop, ...roles } = skin.roles
    return { skin: { ...skin, roles }, error: null }
  }
  const names = new Set(Object.keys(skin.assets))
  let out: RoleOverrides = {}
  const error = firstError((report) => {
    out = validateRoles({ [name]: role }, 'role', names, report)
  })
  if (error || !out[name]) return { skin, error: error ?? 'neplatná role' }
  return { skin: { ...skin, roles: { ...skin.roles, [name]: out[name] as Role } }, error: null }
}

/** Role s výchozími hodnotami pro daný obrázek (nová role v editoru). */
export function defaultRole(name: RoleName, image: string): Role {
  switch (name) {
    case 'background':
      return { image, mode: 'cover' }
    case 'header':
      return { image, mode: 'repeat-x', size: 256, height: 40, position: 'center' }
    case 'divider':
      return { image, mode: 'repeat-x', height: 8 }
    case 'tab':
    case 'panel':
    case 'button':
    case 'dialog':
      return { image, mode: 'stretch' }
  }
}

/** Nastaví ikonu záložky modulu na obrázek, nebo ji odstraní (`null`). */
export function setIcon(skin: Skin, moduleId: string, image: string | null): Change {
  if (image === null) {
    const { [moduleId]: _drop, ...icons } = skin.icons
    return { skin: { ...skin, icons }, error: null }
  }
  if (!(image in skin.assets)) return { skin, error: 'Obrázek v Hávu není.' }
  return { skin: { ...skin, icons: { ...skin.icons, [moduleId]: image } }, error: null }
}

/** Nahradí seznam ozdob (ověří se jako při importu). */
export function setOrnaments(skin: Skin, ornaments: readonly Ornament[]): Change {
  if (ornaments.length > MAX_ORNAMENTS) return { skin, error: `Nejvýše ${MAX_ORNAMENTS} ozdob.` }
  let out: Ornament[] = []
  const error = firstError((report) => {
    out = validateOrnaments(ornaments, 'ozdoby', new Set(Object.keys(skin.assets)), report)
  })
  if (error || out.length !== ornaments.length) return { skin, error: error ?? 'neplatná ozdoba' }
  return { skin: { ...skin, ornaments: out }, error: null }
}

/** Role po změně: při přepnutí na rámeček dostane okraje, při přepnutí pryč se okraje a dlaždice zruší. */
export function patchedRole(cur: Role, patch: Partial<Role>): Role {
  const next: Role = { ...cur, ...patch }
  if (next.mode === 'slice') next.slice ??= [12, 12, 12, 12]
  else {
    delete next.slice
    delete next.width
    delete next.fill
    delete next.edge
  }
  if (!next.mode.startsWith('repeat')) delete next.size
  return next
}
