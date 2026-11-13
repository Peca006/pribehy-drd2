// Příprava textu kódu k přenosu zvukem: v kódu `DRD2:` je stlačený JSON zakódovaný jako base64url (4 znaky na
// 3 bajty), takže se vysílají přímo ty bajty (o čtvrtinu méně). Pro ostatní texty se zkusí deflate a vybere se
// nejmenší varianta. První bajt zprávy je druh: bit 0 = kód `DRD2:` převedený na bajty, bit 1 = stlačeno deflate.
const PREFIX = 'DRD2:'
const B64URL = /^[A-Za-z0-9_-]*$/

const toB64 = (bytes: Uint8Array) => {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const fromB64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

async function pipe(data: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const w = stream.writable.getWriter()
  void w.write(data as BufferSource).catch(() => {})
  void w.close().catch(() => {})
  return new Uint8Array(await new Response(stream.readable).arrayBuffer())
}

const deflate = (d: Uint8Array) => pipe(d, new CompressionStream('deflate-raw'))
const inflate = (d: Uint8Array) => pipe(d, new DecompressionStream('deflate-raw'))
const withKind = (kind: number, d: Uint8Array) => Uint8Array.from([kind, ...d])

/** Nejmenší tvar textu k přenosu (první bajt = druh). */
export async function packMessage(text: string): Promise<Uint8Array> {
  const cands: Uint8Array[] = []
  const utf8 = new TextEncoder().encode(text)
  let raw = utf8
  let bin = false
  if (text.startsWith(PREFIX) && B64URL.test(text.slice(PREFIX.length))) {
    try {
      const b = fromB64(text.slice(PREFIX.length))
      // jen když se text z bajtů vrátí beze změny (jinak by se nepřenesl přesně)
      if (PREFIX + toB64(b) === text) {
        raw = b
        bin = true
      }
    } catch {
      /* neplatný base64: pošle se jako text */
    }
  }
  cands.push(withKind(bin ? 1 : 0, raw))
  try {
    cands.push(withKind((bin ? 1 : 0) | 2, await deflate(raw)))
  } catch {
    /* stlačení není k dispozici */
  }
  return cands.reduce((a, b) => (b.length < a.length ? b : a))
}

/** Opak `packMessage`. */
export async function unpackMessage(bytes: Uint8Array): Promise<string> {
  const kind = bytes[0]
  let d = bytes.slice(1)
  if (kind & 2) d = await inflate(d)
  return kind & 1 ? PREFIX + toB64(d) : new TextDecoder().decode(d)
}
