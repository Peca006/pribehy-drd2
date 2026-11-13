// Rámce protokolu. Na lince jde rámec jako: předzvuk (střídavé bity) + synchronizační slovo + bajty
// [délka][obsah][CRC-16]; obsah je zpráva protokolu níže. Vše je nezávislé na modulaci.
import { crc16 } from './crc'
import { rsDecode, rsEncode } from './rs'

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
  /** vynucený režim (index), nebo 255 = automaticky podle handshake */
  mode: number
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
      return Uint8Array.from([m.type, m.session, ...u32(m.size), ...u16(m.frames), ...u32(m.crc), m.maxMode, m.mode])
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
      if (b.length !== 14) return undefined
      return { type: Type.Call, session, size: r32(b, 2), frames: r16(b, 6), crc: r32(b, 8), maxMode: b[12], mode: b[13] }
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

/** Počet bajtů rámce na lince: [délka][~délka][obsah][CRC-16][kontrolní bajty RS]. */
export const phyBytes = (payloadLen: number, nroots: number) => 2 + payloadLen + 2 + nroots

/** Bajty rámce na lince. Délka je zdvojená (s doplňkem), obsah s CRC-16 je chráněný Reed–Solomonem. */
export function wrapPhy(payload: Uint8Array, nroots = 0): Uint8Array {
  if (payload.length + 2 + nroots > 255) throw new Error('Rámec je příliš dlouhý')
  const body = Uint8Array.from([...payload, ...u16(crc16(payload))])
  const word = rsEncode(body, nroots)
  return Uint8Array.from([payload.length, payload.length ^ 0xff, ...word])
}

/** Z prvních dvou bajtů rámce na lince zjistí délku obsahu, nebo undefined, když je hlavička poškozená. */
export function phyLength(b0: number, b1: number): number | undefined {
  return (b0 ^ b1) === 0xff ? b0 : undefined
}

export interface Unwrapped {
  payload: Uint8Array
  /** kolik bajtů opravil Reed–Solomon */
  corrected: number
}

/** Zkontroluje (a opraví) celý rámec na lince; undefined, když je poškozený. */
export function unwrapPhy(bytes: Uint8Array, nroots = 0): Unwrapped | undefined {
  if (bytes.length < 2) return undefined
  const len = phyLength(bytes[0], bytes[1])
  if (len === undefined || bytes.length < phyBytes(len, nroots)) return undefined
  const word = bytes.slice(2, phyBytes(len, nroots))
  const corrected = rsDecode(word, nroots)
  if (corrected < 0) return undefined
  const payload = word.subarray(0, len)
  if (crc16(payload) !== r16(word, len)) return undefined
  return { payload: payload.slice(), corrected }
}

/** Skládá rámec z příchozích bitů; sám pozná délku a konec. */
export class FrameAssembler {
  private bytes: number[] = []
  private cur = 0
  private nbits = 0
  private need = 0
  /** hotový rámec (po doručení všech bajtů): obsah, nebo null při poškození */
  result?: Unwrapped | null
  constructor(private nroots: number) {}

  get done(): boolean {
    return this.result !== undefined
  }

  push(bit: number) {
    if (this.result !== undefined) return
    this.cur = (this.cur << 1) | bit
    if (++this.nbits < 8) return
    this.bytes.push(this.cur)
    this.cur = 0
    this.nbits = 0
    if (this.bytes.length === 2) {
      const len = phyLength(this.bytes[0], this.bytes[1])
      if (len === undefined) this.result = null
      else this.need = phyBytes(len, this.nroots)
    }
    if (this.need && this.bytes.length >= this.need) this.result = unwrapPhy(Uint8Array.from(this.bytes), this.nroots) ?? null
  }
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
