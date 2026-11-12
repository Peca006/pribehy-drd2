// Přenos kódu `DRD2:…` pomocí QR. Jeden QR bezpečně unese asi 700–1000 znaků (telefon ho přečte z displeje
// druhého telefonu); delší kód se rozdělí na několik QR (díly), která se střídají na displeji, a čtečka je
// složí. Díl má tvar `DRD2Q:<id>.<číslo>.<počet>.<kus kódu>`; krátký kód se posílá beze změny.
const PART = 'DRD2Q:'
const CODE = 'DRD2:'
/** nejvíc znaků kódu v jednom QR */
export const QR_CHUNK = 700

export function splitForQr(code: string, size = QR_CHUNK): string[] {
  if (code.length <= size) return [code]
  const id = Math.random().toString(36).slice(2, 6)
  const n = Math.ceil(code.length / size)
  return Array.from(
    { length: n },
    (_, i) => `${PART}${id}.${i + 1}.${n}.${code.slice(i * size, (i + 1) * size)}`,
  )
}

export type ScanState =
  | { status: 'ignored' }
  | { status: 'partial'; have: number; total: number }
  | { status: 'complete'; code: string }

/** Skládá kód z naskenovaných QR (v libovolném pořadí, opakované díly nevadí). */
export class QrAssembler {
  private id = ''
  private total = 0
  private parts = new Map<number, string>()

  add(text: string): ScanState {
    if (text.startsWith(CODE)) {
      this.reset()
      return { status: 'complete', code: text }
    }
    const m = /^DRD2Q:([a-z0-9]{1,8})\.(\d{1,3})\.(\d{1,3})\.(.*)$/s.exec(text)
    if (!m) return { status: 'ignored' }
    const [, id, i, n, chunk] = m
    const index = Number(i)
    const total = Number(n)
    if (index < 1 || index > total || total > 100) return { status: 'ignored' }
    if (id !== this.id || total !== this.total) {
      this.reset()
      this.id = id
      this.total = total
    }
    this.parts.set(index, chunk)
    if (this.parts.size < total) return { status: 'partial', have: this.parts.size, total }
    let code = ''
    for (let k = 1; k <= total; k++) code += this.parts.get(k)
    this.reset()
    return { status: 'complete', code }
  }

  reset() {
    this.id = ''
    this.total = 0
    this.parts.clear()
  }
}
