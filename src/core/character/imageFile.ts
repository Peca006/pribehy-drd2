// Ilustrace postavy v souboru se sdílením: přikládají se jen při uložení do souboru (kód, QR a zvuk je nenesou) a při
// importu se přidají k postavě; stejný obrázek (podle otisku) se podruhé nepřidá.
import { sha256Hex } from '../hash'
import { listCharacterImages, putCharacterImage, type CharacterImage } from './images'
import type { SharedImage } from './share'

export const toBase64 = (bytes: Uint8Array) => {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}
export const fromBase64 = (data: string) => Uint8Array.from(atob(data), (c) => c.charCodeAt(0))

export async function toSharedImages(images: readonly CharacterImage[]): Promise<SharedImage[]> {
  const out: SharedImage[] = []
  for (const i of images)
    out.push({ mime: i.blob.type || 'image/webp', data: toBase64(new Uint8Array(await i.blob.arrayBuffer())) })
  return out
}

/** Přidá přijaté ilustrace k postavě (bez těch, které už u ní jsou). Vrací počet přidaných a přeskočených. */
export async function importSharedImages(
  characterId: string,
  shared: readonly SharedImage[],
): Promise<{ added: number; skipped: number }> {
  const have = new Set<string>()
  for (const i of await listCharacterImages(characterId)) have.add(await sha256Hex(await i.blob.arrayBuffer()))
  let added = 0
  let skipped = 0
  const base = Date.now()
  for (const s of shared) {
    let bytes: Uint8Array
    try {
      bytes = fromBase64(s.data)
    } catch {
      skipped++
      continue
    }
    const hash = await sha256Hex(bytes)
    if (have.has(hash)) {
      skipped++
      continue
    }
    have.add(hash)
    await putCharacterImage(characterId, new Blob([bytes as BlobPart], { type: s.mime }), base + added)
    added++
  }
  return { added, skipped }
}
