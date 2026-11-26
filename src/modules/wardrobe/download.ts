import { writeSkinFile, type AssetFile } from '../../core/skin/file'
import { SKIN_EXTENSION, type Skin } from '../../core/skin/skin'

/** Stáhne Háv jako soubor `.drdskin` (včetně obrázků). */
export async function downloadSkin(skin: Skin, assets: readonly AssetFile[]): Promise<void> {
  const bytes = await writeSkinFile(skin, assets)
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/zip' }))
  a.download = `${skin.id}${SKIN_EXTENSION}`
  a.click()
  URL.revokeObjectURL(a.href)
}
