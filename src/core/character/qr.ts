// Přenos kódu `DRD2:…` pomocí QR. Hustý QR (stovky znaků) telefon z displeje druhého telefonu nepřečte
// (zkoušeno: díl 700 znaků na Samsungu A52s nešel naskenovat), proto se kód dělí na menší, řidší QR, která se
// střídají na displeji, a čtečka je složí. Díl má tvar `DRD2Q:<id>.<číslo>.<počet>.<kus kódu>`; krátký kód se posílá beze změny.
const PART = 'DRD2Q:'
const CODE = 'DRD2:'
/** nejvíc znaků kódu v jednom QR (menší díl = řidší QR, spolehlivější čtení z displeje) */
export const QR_CHUNK = 250

export function splitForQr(code: string, size = QR_CHUNK): string[] {
  if (code.length <= size) return [code]
  const id = Math.random().toString(36).slice(2, 6)
  const n = Math.ceil(code.length / size)
  // díly stejně velké (rozdíl nejvýš o 1 znak), aby žádný QR nebyl hustší než ostatní
  const base = Math.floor(code.length / n)
  const rem = code.length % n
  let at = 0
  return Array.from({ length: n }, (_, i) => {
    const len = base + (i < rem ? 1 : 0)
    const chunk = code.slice(at, at + len)
    at += len
    return `${PART}${id}.${i + 1}.${n}.${chunk}`
  })
}

/** Část adresy, za kterou je v odkazu v QR kód nebo díl (otevře Import v aplikaci). */
export const IMPORT_HASH = '#/postavy/import/'

/** Adresa aplikace (bez hashe); QR s odkazem ji otevře systémová čtečka a aplikace kód převezme. */
export function appBase(): string {
  return `${location.origin}${location.pathname}`
}

/** Obsah QR jako odkaz do aplikace: systémová čtečka fotoaparátu ho umí otevřít přímo v aplikaci. */
export const toLink = (part: string, base = appBase()) => base + IMPORT_HASH + part

/** Z naskenovaného textu vybere kód / díl: z odkazu do aplikace vezme část za `IMPORT_HASH`, jinak text beze změny. */
export function fromScan(text: string): string {
  const i = text.indexOf(IMPORT_HASH)
  if (i < 0) return text.trim()
  try {
    return decodeURIComponent(text.slice(i + IMPORT_HASH.length)).trim()
  } catch {
    return text.slice(i + IMPORT_HASH.length).trim()
  }
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

  /** Rozepsané díly (pro uložení mezi jednotlivými otevřeními aplikace odkazem). */
  snapshot() {
    return { id: this.id, total: this.total, parts: [...this.parts] as [number, string][] }
  }

  restore(s: { id?: unknown; total?: unknown; parts?: unknown }) {
    this.reset()
    if (typeof s.id !== 'string' || typeof s.total !== 'number' || !Array.isArray(s.parts)) return
    this.id = s.id
    this.total = s.total
    for (const p of s.parts)
      if (
        Array.isArray(p) &&
        typeof p[0] === 'number' &&
        typeof p[1] === 'string' &&
        p[1].length < 2000
      )
        this.parts.set(p[0], p[1])
  }
}

const STORE_KEY = 'drd2-qr-parts'
const TTL = 15 * 60 * 1000

/** Složeč s rozepsanými díly z předchozích naskenování (platí 15 minut), jinak prázdný. */
export function loadAssembler(): QrAssembler {
  const a = new QrAssembler()
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null')
    if (raw && typeof raw.at === 'number' && Date.now() - raw.at < TTL) a.restore(raw)
  } catch {
    /* prázdný složeč */
  }
  return a
}

export function saveAssembler(a: QrAssembler) {
  try {
    const s = a.snapshot()
    if (!s.parts.length) localStorage.removeItem(STORE_KEY)
    else localStorage.setItem(STORE_KEY, JSON.stringify({ ...s, at: Date.now() }))
  } catch {
    /* bez úložiště se díly po otevření dalšího odkazu nesloží */
  }
}
