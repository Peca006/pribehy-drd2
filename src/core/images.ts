// Společné zpracování obrázků přikládaných k bytostem a postavám: zmenšení před uložením, ať úložiště nenabobtnalo.
const MAX_SIDE = 1280

/** Zmenší obrázek na nejdelší stranu `MAX_SIDE` a převede na WebP. */
export async function shrinkImage(file: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * k)
  canvas.height = Math.round(bmp.height * k)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  return new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('Obrázek se nepodařilo zpracovat.'))), 'image/webp', 0.85),
  )
}
