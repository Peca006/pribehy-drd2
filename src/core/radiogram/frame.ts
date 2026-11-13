// Rámce protokolu. Na lince jde rámec jako: předzvuk (střídavé bity) + synchronizační slovo + bajty
// [délka][obsah][CRC-16]; obsah je zpráva protokolu níže. Vše je nezávislé na modulaci.
import { crc16 } from './crc'

/** Velikost kusu dat v jednom rámci DATA (bajtů). Malý rámec = kratší, tedy spolehlivější při šumu. */
export const CHUNK = 48
export const MAX_PAYLOAD = 255

export const Type = { Call: 1, Ready: 2, Data: 3, Ack: 4 } as const
// Call = volání odesílatele (velikost zprávy, počet rámců, CRC-32, nejvyšší režim); Ready = odpověď příjemce
// (naměřený odstup signálu a doporučený režim); Data = kus dat s číslem; Ack = bitová mapa přijatých rámců

export interface Call {
  type: typeof Type.Call
  session: number
  /** délka zprávy v bajtech */
  size: number
  /** počet rámců DATA */
  frames: number
  /** CRC-32 celé zprávy */
  crc: number
  /** nejrychlejší režim, který odesílatel umí (index do tabulky režimů) */
  maxMode: number
}
export interface Ready {
  type: typeof Type.Ready
  session: number
  /** naměřený odstup signálu při volání, dB (zaokrouhleno, -128…127) */
  snr: number
  /** doporučený režim */
  mode: number
}
export interface Data {
  type: typeof Type.Data
  session: number
  seq: number
  data: Uint8Array
}
export interface Ack {
  type: typeof Type.Ack
  session: number
  /** bitová mapa přijatých rámců (bit i = rámec i) */
  map: Uint8Array
}
export type Msg = Call | Ready | Data | Ack

const u16 = (v: number) => [(v >> 8) & 255, v & 255]
const u32 = (v: number) => [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255]
const r16 = (b: Uint8Array, i: number) => (b[i] << 8) | b[i + 1]
const r32 = (b: Uint8Array, i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0

export function encodeMsg(m: Msg): Uint8Array {
  switch (m.type) {
    case Type.Call:
      return Uint8Array.from([m.type, m.session, ...u32(m.size), ...u16(m.frames), ...u32(m.crc), m.maxMode])
    case Type.Ready:
      return Uint8Array.from([m.type, m.session, m.snr & 255, m.mode])
    case Type.Data:
      return Uint8Array.from([m.type, m.session, ...u16(m.seq), ...m.data])
    case Type.Ack:
      return Uint8Array.from([m.type, m.session, ...m.map])
  }
}

export function decodeMsg(b: Uint8Array): Msg | undefined {
  if (b.length < 2) return undefined
  const session = b[1]
  switch (b[0]) {
    case Type.Call:
      if (b.length !== 13) return undefined
      return { type: Type.Call, session, size: r32(b, 2), frames: r16(b, 6), crc: r32(b, 8), maxMode: b[12] }
    case Type.Ready:
      if (b.length !== 4) return undefined
      return { type: Type.Ready, session, snr: (b[2] << 24) >> 24, mode: b[3] }
    case Type.Data:
      if (b.length < 4) return undefined
      return { type: Type.Data, session, seq: r16(b, 2), data: b.slice(4) }
    case Type.Ack:
      return { type: Type.Ack, session, map: b.slice(2) }
  }
  return undefined
}

/** Bajty rámce na lince: [délka][obsah][CRC-16 z délky a obsahu]. */
export function wrapPhy(payload: Uint8Array): Uint8Array {
  if (payload.length > MAX_PAYLOAD) throw new Error('Rámec je příliš dlouhý')
  const body = Uint8Array.from([payload.length, ...payload])
  return Uint8Array.from([...body, ...u16(crc16(body))])
}

/** Zkontroluje CRC a vrátí obsah, jinak undefined. `bytes` může být delší (zbytek se ignoruje). */
export function unwrapPhy(bytes: Uint8Array): Uint8Array | undefined {
  if (bytes.length < 3) return undefined
  const len = bytes[0]
  if (bytes.length < len + 3) return undefined
  const body = bytes.subarray(0, len + 1)
  if (crc16(body) !== r16(bytes, len + 1)) return undefined
  return bytes.slice(1, len + 1)
}

/** Rozdělí zprávu na kusy po `CHUNK` bajtech. */
export function splitData(msg: Uint8Array, chunk = CHUNK): Uint8Array[] {
  const out: Uint8Array[] = []
  for (let i = 0; i < msg.length; i += chunk) out.push(msg.subarray(i, i + chunk))
  return out.length ? out : [new Uint8Array(0)]
}

export const mapBytes = (frames: number) => Math.ceil(frames / 8)
export const hasBit = (map: Uint8Array, i: number) => (map[i >> 3] & (1 << (i & 7))) !== 0
export function setBit(map: Uint8Array, i: number) {
  map[i >> 3] |= 1 << (i & 7)
}
