// Minimální ZIP čtečka a zapisovač pro soubory `.drdskin`, bez závislostí: dekomprese přes `DecompressionStream`
// ('deflate-raw'), která je v prohlížečích i v Node. Čteme nedůvěryhodný vstup, proto:
//  - nepodporujeme ZIP64, šifrování, vícedílné archivy ani jiné metody než „uloženo“ a deflate,
//  - velikost se kontroluje podle hlavičky i za běhu dekomprese (hlavička může lhát, jde o zip bombu),
//  - názvy souborů musí mít bezpečný tvar (nic se nikdy nezapisuje na disk, ale cesty přesto ověřujeme),
//  - u každé položky se ověří CRC-32.

export class ZipError extends Error {}

export interface ZipFile {
  name: string
  data: Uint8Array
}

export interface ZipLimits {
  maxEntries: number
  maxEntryBytes: number
  maxTotalBytes: number
}

const SIG_LOCAL = 0x04034b50
const SIG_CENTRAL = 0x02014b50
const SIG_END = 0x06054b50
const SAFE_NAME = /^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]!) & 0xff]! ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export function isSafeZipName(name: string): boolean {
  return (
    SAFE_NAME.test(name) &&
    name.length <= 120 &&
    !name.split('/').some((p) => p === '.' || p === '..')
  )
}

type Bytes = Uint8Array<ArrayBuffer>

async function pump(
  stream: { writable: WritableStream<Bytes>; readable: ReadableStream<Uint8Array> },
  data: Uint8Array,
  max: number,
): Promise<Uint8Array> {
  const writer = stream.writable.getWriter()
  // chyby vstupu přijdou i ze čtení; tady je jen potlačíme, ať nevzniká nezachycené odmítnutí
  writer.write(data as Bytes).catch(() => undefined)
  writer.close().catch(() => undefined)
  const reader = stream.readable.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.length
      if (total > max) {
        await reader.cancel().catch(() => undefined)
        throw new ZipError('položka archivu je po rozbalení větší, než je povoleno')
      }
      chunks.push(value)
    }
  } catch (e) {
    if (e instanceof ZipError) throw e
    throw new ZipError('poškozená data v archivu')
  }
  return concat(chunks, total)
}

const inflateRaw = (data: Uint8Array, max: number) =>
  pump(new DecompressionStream('deflate-raw') as never, data, max)
const deflateRaw = (data: Uint8Array) =>
  pump(new CompressionStream('deflate-raw') as never, data, Number.MAX_SAFE_INTEGER)

function concat(chunks: Uint8Array[], total: number): Uint8Array {
  const out = new Uint8Array(total)
  let off = 0
  for (const c of chunks) {
    out.set(c, off)
    off += c.length
  }
  return out
}

/** Přečte ZIP; vyhodí `ZipError` při poškození, nepodporované funkci nebo překročení limitů. */
export async function readZip(bytes: Uint8Array, limits: ZipLimits): Promise<ZipFile[]> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const u16 = (o: number) => view.getUint16(o, true)
  const u32 = (o: number) => view.getUint32(o, true)
  const need = (o: number, n: number) => {
    if (o < 0 || o + n > bytes.length) throw new ZipError('archiv je poškozený nebo useknutý')
  }

  // konec centrálního adresáře hledáme od konce (za ním smí být komentář do 65 535 B)
  let end = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 0xffff); i--) {
    if (u32(i) === SIG_END) {
      end = i
      break
    }
  }
  if (end < 0) throw new ZipError('to není ZIP archiv')
  const count = u16(end + 10)
  const dirSize = u32(end + 12)
  const dirOffset = u32(end + 16)
  if (u16(end + 4) !== 0 || u16(end + 6) !== 0 || u16(end + 8) !== count)
    throw new ZipError('vícedílné archivy nejsou podporovány')
  if (count === 0xffff || dirSize === 0xffffffff || dirOffset === 0xffffffff)
    throw new ZipError('ZIP64 není podporován')
  if (count > limits.maxEntries)
    throw new ZipError(`archiv má příliš mnoho položek (nejvýše ${limits.maxEntries})`)
  need(dirOffset, dirSize)

  const files: ZipFile[] = []
  const seen = new Set<string>()
  let total = 0
  let pos = dirOffset
  for (let i = 0; i < count; i++) {
    need(pos, 46)
    if (u32(pos) !== SIG_CENTRAL) throw new ZipError('poškozený adresář archivu')
    const flags = u16(pos + 8)
    const method = u16(pos + 10)
    const crc = u32(pos + 16)
    const csize = u32(pos + 20)
    const usize = u32(pos + 24)
    const nameLen = u16(pos + 28)
    const extraLen = u16(pos + 30)
    const commentLen = u16(pos + 32)
    const localOffset = u32(pos + 42)
    need(pos + 46, nameLen)
    let name: string
    try {
      name = new TextDecoder('utf-8', { fatal: true }).decode(
        bytes.subarray(pos + 46, pos + 46 + nameLen),
      )
    } catch {
      throw new ZipError('neplatný název souboru v archivu')
    }
    pos += 46 + nameLen + extraLen + commentLen

    if (name.endsWith('/')) continue // složka
    if (!isSafeZipName(name))
      throw new ZipError(`nepovolený název souboru v archivu: „${name.slice(0, 40)}“`)
    if (seen.has(name)) throw new ZipError(`soubor „${name}“ je v archivu dvakrát`)
    seen.add(name)
    if (flags & 1) throw new ZipError('šifrované archivy nejsou podporovány')
    if (csize === 0xffffffff || usize === 0xffffffff || localOffset === 0xffffffff)
      throw new ZipError('ZIP64 není podporován')
    if (usize > limits.maxEntryBytes)
      throw new ZipError(`soubor „${name}“ je větší než ${limits.maxEntryBytes} bajtů`)
    total += usize
    if (total > limits.maxTotalBytes) throw new ZipError('archiv je po rozbalení příliš velký')

    need(localOffset, 30)
    if (u32(localOffset) !== SIG_LOCAL) throw new ZipError('poškozená hlavička souboru v archivu')
    const dataStart = localOffset + 30 + u16(localOffset + 26) + u16(localOffset + 28)
    need(dataStart, csize)
    const raw = bytes.subarray(dataStart, dataStart + csize)

    let data: Uint8Array
    if (method === 0) {
      if (csize !== usize) throw new ZipError('poškozená položka archivu')
      data = raw.slice()
    } else if (method === 8) {
      data = await inflateRaw(raw, usize)
      if (data.length !== usize) throw new ZipError('poškozená položka archivu')
    } else throw new ZipError(`nepodporovaná komprese (${method})`)
    if (crc32(data) !== crc)
      throw new ZipError(`soubor „${name}“ je poškozený (nesedí kontrolní součet)`)
    files.push({ name, data })
  }
  return files
}

/** Zapíše ZIP (každý soubor deflate, nebo uložený, podle toho, co je menší). Jména se kontrolují jako při čtení. */
export async function writeZip(files: ZipFile[]): Promise<Uint8Array> {
  const enc = new TextEncoder()
  const parts: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  const seen = new Set<string>()
  for (const f of files) {
    if (!isSafeZipName(f.name)) throw new ZipError(`nepovolený název souboru: „${f.name}“`)
    if (seen.has(f.name)) throw new ZipError(`soubor „${f.name}“ je v archivu dvakrát`)
    seen.add(f.name)
    const name = enc.encode(f.name)
    const crc = crc32(f.data)
    const deflated = f.data.length > 0 ? await deflateRaw(f.data) : f.data
    const useDeflate = deflated.length < f.data.length
    const body = useDeflate ? deflated : f.data
    const method = useDeflate ? 8 : 0

    const local = new Uint8Array(30 + name.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, SIG_LOCAL, true)
    lv.setUint16(4, 20, true) // verze potřebná k rozbalení
    lv.setUint16(6, 0x0800, true) // názvy v UTF-8
    lv.setUint16(8, method, true)
    lv.setUint16(10, 0, true) // čas
    lv.setUint16(12, 0x0021, true) // datum 1. 1. 1980 (výstup je tak opakovatelný)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, body.length, true)
    lv.setUint32(22, f.data.length, true)
    lv.setUint16(26, name.length, true)
    local.set(name, 30)

    const cen = new Uint8Array(46 + name.length)
    const cv = new DataView(cen.buffer)
    cv.setUint32(0, SIG_CENTRAL, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0x0800, true)
    cv.setUint16(10, method, true)
    cv.setUint16(12, 0, true)
    cv.setUint16(14, 0x0021, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, body.length, true)
    cv.setUint32(24, f.data.length, true)
    cv.setUint16(28, name.length, true)
    cv.setUint32(42, offset, true)
    cen.set(name, 46)

    parts.push(local, body)
    central.push(cen)
    offset += local.length + body.length
  }
  const dirSize = central.reduce((n, c) => n + c.length, 0)
  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  ev.setUint32(0, SIG_END, true)
  ev.setUint16(8, files.length, true)
  ev.setUint16(10, files.length, true)
  ev.setUint32(12, dirSize, true)
  ev.setUint32(16, offset, true)
  const all = [...parts, ...central, end]
  return concat(
    all,
    all.reduce((n, p) => n + p.length, 0),
  )
}
