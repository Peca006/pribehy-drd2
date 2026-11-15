// Kontrolní součty rámců: CRC-16/CCITT-FALSE (rámec) a CRC-32 (celá zpráva).

export function crc16(data: Uint8Array): number {
  let c = 0xffff
  for (const b of data) {
    c ^= b << 8
    for (let i = 0; i < 8; i++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff
  }
  return c
}

const T32 = (() => {
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
  for (const b of data) c = T32[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
