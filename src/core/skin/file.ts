// Soubor `.drdskin`: ZIP s `manifest.json` (a od M2 s `assets/…`). Čtení nikdy nevyhazuje výjimku kvůli špatnému
// vstupu, vše se vrací jako problémy ve `SkinValidation`, aby je Šatník mohl uživateli ukázat.
import {
  MAX_MANIFEST_BYTES,
  validateSkin,
  type Skin,
  type SkinIssue,
  type SkinValidation,
  type ValidateOptions,
} from './skin'
import { readZip, writeZip, ZipError } from './zip'

export const MAX_SKIN_FILE_BYTES = 8 * 1024 * 1024
export const MANIFEST_NAME = 'manifest.json'
/** BOM na začátku textu (zapisuje ho např. Notepad); zapsáno přes kód, ať ho formátovač nezmění na neviditelný znak */
const BOM = new RegExp(`^${String.fromCharCode(0xfeff)}`)

const failure = (message: string, path = ''): SkinValidation => ({
  ok: false,
  skin: null,
  issues: [{ level: 'error', path, message }],
})

/** Načte a zvaliduje soubor `.drdskin`. */
export async function readSkinFile(
  bytes: Uint8Array,
  options: ValidateOptions = {},
): Promise<SkinValidation> {
  if (bytes.length > MAX_SKIN_FILE_BYTES)
    return failure(`soubor je větší než ${MAX_SKIN_FILE_BYTES / 1024 / 1024} MB`)
  let files
  try {
    files = await readZip(bytes, {
      maxEntries: 64,
      maxEntryBytes: 2 * 1024 * 1024,
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
  const ignored: SkinIssue[] = files
    .filter((f) => f.name !== MANIFEST_NAME)
    .map((f) => ({ level: 'warning', path: f.name, message: 'soubor se zatím ignoruje' }))
  return { ...result, issues: [...ignored, ...result.issues] }
}

/** Zapíše Háv jako soubor `.drdskin` (jen manifest; obrázky přijdou v M2). */
export function writeSkinFile(skin: Skin): Promise<Uint8Array> {
  const manifest = { ...skin, assets: {} }
  const data = new TextEncoder().encode(JSON.stringify(manifest, null, 2) + '\n')
  return writeZip([{ name: MANIFEST_NAME, data }])
}
