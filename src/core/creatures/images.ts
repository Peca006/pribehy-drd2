// Vlastní obrázky bytostí (bytost z knihy i vlastní). Ukládají se jen v zařízení, k jedné bytosti
// jich může být víc. Před uložením se zmenší, aby úložiště nenabobtnalo.
import { run } from '../db'

export interface CreatureImage {
  id: string
  creatureId: string
  blob: Blob
  added: number
}

const MAX_SIDE = 1280

export const listImages = (creatureId: string) =>
  run<CreatureImage[]>('creatureImages', 'readonly', (s) =>
    s.index('creatureId').getAll(creatureId),
  ).then((l) => l.sort((a, b) => a.added - b.added))

export const deleteImage = (id: string) =>
  run('creatureImages', 'readwrite', (s) => s.delete(id))

export async function deleteImagesOf(creatureId: string) {
  for (const i of await listImages(creatureId)) await deleteImage(i.id)
}

/** Zmenší obrázek na nejdelší stranu `MAX_SIDE` a uloží jako WebP. */
export async function addImage(creatureId: string, file: File): Promise<void> {
  const bmp = await createImageBitmap(file)
  const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * k)
  canvas.height = Math.round(bmp.height * k)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('Obrázek se nepodařilo zpracovat.'))), 'image/webp', 0.85),
  )
  const image: CreatureImage = { id: crypto.randomUUID(), creatureId, blob, added: Date.now() }
  await run('creatureImages', 'readwrite', (s) => s.put(image))
}
