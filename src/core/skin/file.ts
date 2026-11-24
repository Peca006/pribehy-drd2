// Soubor `.drdskin`: ZIP s `manifest.json` a obrázky v `assets/`. Čtení nikdy nevyhazuje výjimku kvůli špatnému
// vstupu, vše se vrací jako problémy ve výsledku, aby je Šatník mohl uživateli ukázat. Obsah každého obrázku se
// kontroluje (typ podle podpisu, rozměry, bezpečnost SVG), deklarace v manifestu nic nezaručuje.
import { inspectImage, type ImageType } from './image'
import {
  MAX_MANIFEST_BYTES,
  validateSkin,
  type Skin,
  type SkinIssue,
  type SkinValidation,
  type ValidateOptions,
} from './skin'
import { readZip, writeZip, ZipError, type ZipFile } from './zip'

export const MAX_SKIN_FILE_BYTES = 8 * 1024 * 1024
export const MAX_ASSET_BYTES = 2 * 1024 * 1024
/** součet pixelů všech rastrových obrázků (po rozbalení v paměti zabírají asi 4 B na pixel) */
export const MAX_TOTAL_PIXELS = 16 * 1024 * 1024
export const MANIFEST_NAME = 'manifest.json'
/** BOM na začátku textu (zapisuje ho např. Notepad); zapsáno přes kód, ať ho formátovač nezmění na neviditelný znak */
const BOM = new RegExp(`^${String.fromCharCode(0xfeff)}`)

/** Zkontrolovaný obrázek z Hávu. */
export interface AssetFile {
  /** název podle manifestu (`assets` → klíč) */
  name: string
  type: ImageType
  bytes: Uint8Array
  width?: number
  height?: number
}

export interface SkinFileResult extends SkinValidation {
  /** zkontrolované obrázky (prázdné, když Háv není platný) */
  assets: AssetFile[]
}

const failure = (message: string, path = ''): SkinFileResult => ({
  ok: false,
  skin: null,
  issues: [{ level: 'error', path, message }],
  assets: [],
})

/** Načte a zvaliduje soubor `.drdskin` včetně obrázků. */
export async function readSkinFile(
  bytes: Uint8Array,
  options: ValidateOptions = {},
): Promise<SkinFileResult> {
  if (bytes.length > MAX_SKIN_FILE_BYTES)
    return failure(`soubor je větší než ${MAX_SKIN_FILE_BYTES / 1024 / 1024} MB`)
  let files: ZipFile[]
  try {
    files = await readZip(bytes, {
      maxEntries: 64,
      maxEntryBytes: MAX_ASSET_BYTES,
      maxTotalBytes: MAX_SKIN_FILE_BYTES,
    })
  } catch (e) {
    if (e instanceof ZipError) return failure(e.message)
    throw e
  }
  const manifest = files.find((f) => f.name === MANIFEST_NAME)
  if (!manifest) return failure('v archivu chybí manifest.json', MANIFEST_NAME)
  if (manifest.data.length > MAX_MANIFEST_BYTES)
    return failure(`manifest je větší než ${MAX_MANIFEST_BYTES / 1024} kB`, MANIFEST_NAME)

  let raw: unknown
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(manifest.data).replace(BOM, '')
    raw = JSON.parse(text)
  } catch {
    return failure('manifest.json není platný JSON v UTF-8', MANIFEST_NAME)
  }

  const result = validateSkin(raw, options)
  const issues: SkinIssue[] = [...result.issues]
  const assets: AssetFile[] = []

  if (result.skin) {
    const referenced = new Set<string>()
    let pixels = 0
    for (const [name, ref] of Object.entries(result.skin.assets)) {
      referenced.add(ref.file)
      const file = files.find((f) => f.name === ref.file)
      if (!file) {
        issues.push({
          level: 'error',
          path: `assets.${name}.file`,
          message: `v archivu chybí soubor ${ref.file}`,
        })
        continue
      }
      const check = inspectImage(file.data)
      if (!check.ok) {
        issues.push({
          level: 'error',
          path: `assets.${name}`,
          message: `${ref.file}: ${check.error}`,
        })
        continue
      }
      pixels += (check.info.width ?? 0) * (check.info.height ?? 0)
      assets.push({
        name,
        type: check.info.type,
        bytes: file.data,
        width: check.info.width,
        height: check.info.height,
      })
    }
    if (pixels > MAX_TOTAL_PIXELS) {
      issues.push({
        level: 'error',
        path: 'assets',
        message: `obrázky mají dohromady příliš mnoho pixelů (${Math.round(pixels / 1e6)} milionů, nejvýše ${Math.round(MAX_TOTAL_PIXELS / 1e6)})`,
      })
    }
    // soubory, které žádný obrázek neodkazuje, se ignorují
    for (const f of files) {
      if (f.name !== MANIFEST_NAME && !referenced.has(f.name)) {
        issues.push({
          level: 'warning',
          path: f.name,
          message: 'soubor není v manifestu a ignoruje se',
        })
      }
    }
  } else {
    for (const f of files) {
      if (f.name !== MANIFEST_NAME)
        issues.push({
          level: 'warning',
          path: f.name,
          message: 'soubor se nezpracoval (manifest je neplatný)',
        })
    }
  }

  const ok = !issues.some((i) => i.level === 'error')
  return { ok, skin: ok ? result.skin : null, issues, assets: ok ? assets : [] }
}

/** Zapíše Háv jako soubor `.drdskin`. `assets` musí obsahovat bajty každého obrázku z manifestu. */
export function writeSkinFile(skin: Skin, assets: readonly AssetFile[] = []): Promise<Uint8Array> {
  const byName = new Map(assets.map((a) => [a.name, a]))
  const files: ZipFile[] = [
    { name: MANIFEST_NAME, data: new TextEncoder().encode(JSON.stringify(skin, null, 2) + '\n') },
  ]
  const written = new Set<string>() // dva názvy mohou odkazovat na týž soubor
  for (const [name, ref] of Object.entries(skin.assets)) {
    const asset = byName.get(name)
    if (!asset) return Promise.reject(new Error(`chybí obrázek „${name}“ pro zápis souboru`))
    if (written.has(ref.file)) continue
    written.add(ref.file)
    files.push({ name: ref.file, data: asset.bytes })
  }
  return writeZip(files)
}
