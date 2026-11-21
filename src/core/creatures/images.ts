// Vlastní obrázky bytostí (bytost z knihy i vlastní). Ukládají se jen v zařízení, k jedné bytosti
// jich může být víc. Před uložením se zmenší, aby úložiště nenabobtnalo.
import { run } from '../db'
import { shrinkImage } from '../images'

export interface CreatureImage {
  id: string
  creatureId: string
  blob: Blob
  added: number
}

export const listImages = (creatureId: string) =>
  run<CreatureImage[]>('creatureImages', 'readonly', (s) =>
    s.index('creatureId').getAll(creatureId),
  ).then((l) => l.sort((a, b) => a.added - b.added))

export const deleteImage = (id: string) =>
  run('creatureImages', 'readwrite', (s) => s.delete(id))

export async function deleteImagesOf(creatureId: string) {
  for (const i of await listImages(creatureId)) await deleteImage(i.id)
}

export async function addImage(creatureId: string, file: File): Promise<void> {
  const image: CreatureImage = { id: crypto.randomUUID(), creatureId, blob: await shrinkImage(file), added: Date.now() }
  await run('creatureImages', 'readwrite', (s) => s.put(image))
}
