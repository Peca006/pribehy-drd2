// Ilustrace postav (portrét, obrázek z hry…). Ukládají se jen v tomto zařízení, k jedné postavě jich může být víc,
// mimo deník změn (nejsou součástí revizí ani sdíleného kódu, QR či zvuku). Dají se uložit do souboru.
import { run } from '../db'
import { shrinkImage } from '../images'

export interface CharacterImage {
  id: string
  characterId: string
  blob: Blob
  added: number
}

export const listCharacterImages = (characterId: string) =>
  run<CharacterImage[]>('characterImages', 'readonly', (s) => s.index('characterId').getAll(characterId)).then((l) =>
    l.sort((a, b) => a.added - b.added),
  )

export const deleteCharacterImage = (id: string) => run('characterImages', 'readwrite', (s) => s.delete(id))

export async function deleteImagesOfCharacter(characterId: string) {
  for (const i of await listCharacterImages(characterId)) await deleteCharacterImage(i.id)
}

export async function addCharacterImage(characterId: string, file: Blob): Promise<void> {
  const image: CharacterImage = { id: crypto.randomUUID(), characterId, blob: await shrinkImage(file), added: Date.now() }
  await run('characterImages', 'readwrite', (s) => s.put(image))
}

/** Název souboru při uložení ilustrace (podle jména postavy a pořadí). */
export const imageFileName = (name: string, index: number): string => {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${slug || 'postava'}-${index + 1}.webp`
}
