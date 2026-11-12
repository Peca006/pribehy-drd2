// QR jako matice a jako obrázek PNG (k uložení nebo sdílení). Oprava chyb M (čtečka snese odlesky a neostrost).
import qrcode from 'qrcode-generator'

const QUIET = 4 // tichá zóna kolem QR v modulech

/** Matice modulů QR: `size` včetně tiché zóny a `dark(x, y)` pro tmavý modul (souřadnice bez tiché zóny). */
export function qrMatrix(text: string) {
  const qr = qrcode(0, 'M')
  qr.addData(text, 'Byte')
  qr.make()
  const n = qr.getModuleCount()
  return { n, size: n + 2 * QUIET, dark: (x: number, y: number) => qr.isDark(y, x) }
}

/** Cesta SVG se všemi tmavými moduly (s tichou zónou). */
export function qrPath(text: string): { size: number; d: string } {
  const { n, size, dark } = qrMatrix(text)
  let d = ''
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) if (dark(x, y)) d += `M${x + QUIET} ${y + QUIET}h1v1h-1z`
  return { size, d }
}

/** PNG s QR (bílé pozadí, celé násobky pixelů na modul, aby byl obraz ostrý); `px` je přibližná velikost. */
export async function qrPng(text: string, px = 1024): Promise<Blob> {
  const { n, size, dark } = qrMatrix(text)
  const cell = Math.max(2, Math.floor(px / size))
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size * cell
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#000'
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      if (dark(x, y)) ctx.fillRect((x + QUIET) * cell, (y + QUIET) * cell, cell, cell)
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Obrázek se nepodařilo vytvořit.'))),
      'image/png',
    ),
  )
}
