// SHA-256 jako malé hexadecimální řetězce (kontrola stažených balíčků, otisky obsahu předpisů).

const hex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

/** SHA-256 textu (UTF-8) nebo bajtů jako 64 hexadecimálních znaků. */
export async function sha256Hex(data: string | ArrayBuffer | Uint8Array): Promise<string> {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
  return hex(await crypto.subtle.digest('SHA-256', bytes as BufferSource))
}
