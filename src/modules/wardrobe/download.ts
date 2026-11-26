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

/** Umí prohlížeč sdílet soubor (systémové Sdílet)? */
export const canShareFiles = (): boolean => {
  if (typeof navigator === 'undefined' || !navigator.canShare) return false
  try {
    return navigator.canShare({ files: [new File([''], 'a.drdskin', { type: 'application/zip' })] })
  } catch {
    return false
  }
}

/** Pošle Háv jako soubor `.drdskin` přes systémové Sdílet (příjemce ho otevře v Přijmout obsah nebo v Šatníku). */
export async function shareSkin(skin: Skin, assets: readonly AssetFile[]): Promise<void> {
  const bytes = await writeSkinFile(skin, assets)
  const file = new File([bytes as Uint8Array<ArrayBuffer>], `${skin.id}${SKIN_EXTENSION}`, { type: 'application/zip' })
  try {
    await navigator.share({ title: `Háv ${skin.name}`, files: [file] })
  } catch {
    /* uživatel sdílení zrušil */
  }
}
