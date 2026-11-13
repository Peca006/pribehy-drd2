// Protokol přenosu zprávy zvukem mezi dvěma zařízeními, poloduplexně (střídavě se vysílá a poslouchá):
//
//   odesílatel                       příjemce
//   CALL (režim 0)         ───────▶  změří odstup signálu, zvolí režim
//                          ◀───────  READY (odstup, doporučený režim)   [režim 0]
//   DATA po dávkách        ───────▶  ukládá rámce s platným CRC
//                          ◀───────  ACK (bitová mapa přijatých)        [režim 0]
//   znovu jen chybějící    ───────▶  …až je zpráva celá (a souhlasí CRC-32)
//
// Odpovědi příjemce jdou vždy nejrobustnějším režimem. Při neúspěšných kolech odesílatel zpomalí na nižší
// režim; příjemce proto při nezdaru zkouší demodulovat všemi režimy. Jádro nepracuje s hodinami ani zvukovou
// kartou: hostitel (audio.ts, testy) pouští `tx().audio`, po uplynutí `listen` sekund předá nahrávku do `rx()`.
import { airtime, demodulate, modulate, SAMPLE_RATE } from './afsk'
import { crc32 } from './crc'
import {
  CHUNK,
  decodeMsg,
  encodeMsg,
  hasBit,
  mapBytes,
  setBit,
  splitData,
  Type,
  type Msg,
} from './frame'
import { chooseMode, HANDSHAKE_MODE, MODES, modeById, type Mode } from './modes'

export interface Tx {
  /** zvuk k přehrání */
  audio: Float32Array
  /** jak dlouho po přehrání poslouchat odpověď (s); 0 = neposlouchat odpověď, jen pokračovat */
  listen: number
  /** popis pro rozhraní */
  label: string
}

export type SenderState = 'call' | 'data' | 'done' | 'failed'
export type ReceiverState = 'idle' | 'receiving' | 'complete'

/** Kolik rámců DATA se pošle v jedné dávce, než se čeká na ACK. */
export const BURST = 12
/** Rezerva na zpoždění zařízení a ticho kolem vysílání (s). */
const MARGIN = 1.2

const frameAir = (bytes: number, m: Mode) => airtime(bytes, m.afsk)

export interface SenderOptions {
  fs?: number
  /** nejrychlejší režim, který smí odesílatel použít */
  maxMode?: number
  session?: number
  /** kolikrát se opakuje volání, než se vzdá */
  maxCalls?: number
  /** kolikrát se opakuje dávka bez pokroku, než se vzdá */
  maxStalls?: number
}

export class RadioSender {
  state: SenderState = 'call'
  mode: Mode = HANDSHAKE_MODE
  /** naměřený odstup signálu u příjemce (dB), až po odpovědi READY */
  remoteSnr?: number
  readonly session: number
  readonly frames: number
  private chunks: Uint8Array[]
  private acked: Uint8Array
  private calls = 0
  private stalls = 0
  private lastCount = 0
  private fs: number
  private maxMode: number
  private opt: Required<Pick<SenderOptions, 'maxCalls' | 'maxStalls'>>

  constructor(
    private message: Uint8Array,
    o: SenderOptions = {},
  ) {
    this.fs = o.fs ?? SAMPLE_RATE
    this.maxMode = Math.min(o.maxMode ?? MODES.length - 1, MODES.length - 1)
    this.session = o.session ?? Math.floor(Math.random() * 256)
    this.chunks = splitData(message)
    this.frames = this.chunks.length
    this.acked = new Uint8Array(mapBytes(this.frames))
    this.opt = { maxCalls: o.maxCalls ?? 6, maxStalls: o.maxStalls ?? 6 }
  }

  /** kolik rámců příjemce potvrdil */
  get confirmed(): number {
    let n = 0
    for (let i = 0; i < this.frames; i++) if (hasBit(this.acked, i)) n++
    return n
  }

  /** Odhad zbývající doby přenosu při současném režimu (s). */
  get eta(): number {
    const per = frameAir(CHUNK + 4, this.mode) + 0.02
    return (this.frames - this.confirmed) * per
  }

  /** Další vysílání, nebo undefined, když je přenos hotový či selhal. */
  tx(): Tx | undefined {
    if (this.state === 'done' || this.state === 'failed') return undefined
    if (this.state === 'call') {
      const call: Msg = {
        type: Type.Call,
        session: this.session,
        size: this.message.length,
        frames: this.frames,
        crc: crc32(this.message),
        maxMode: this.maxMode,
      }
      this.calls++
      const audio = modulate([encodeMsg(call)], HANDSHAKE_MODE.afsk, this.fs)
      return { audio, listen: frameAir(6, HANDSHAKE_MODE) + MARGIN, label: 'Volání' }
    }
    // dávka dalších nepotvrzených rámců
    const todo: number[] = []
    for (let i = 0; i < this.frames && todo.length < BURST; i++) if (!hasBit(this.acked, i)) todo.push(i)
    const msgs = todo.map((seq) => encodeMsg({ type: Type.Data, session: this.session, seq, data: this.chunks[seq] }))
    const audio = modulate(msgs, this.mode.afsk, this.fs)
    const ack = frameAir(2 + mapBytes(this.frames), HANDSHAKE_MODE)
    return { audio, listen: ack + MARGIN, label: `Data ${this.confirmed}/${this.frames} (${this.mode.name})` }
  }

  /** Nahrávka z okna poslechu po posledním `tx()`. */
  rx(samples: Float32Array): void {
    if (this.state === 'call') {
      const d = demodulate(samples, HANDSHAKE_MODE.afsk, this.fs)
      for (const f of d.frames) {
        const m = decodeMsg(f)
        if (m?.type === Type.Ready && m.session === this.session) {
          this.remoteSnr = m.snr
          this.mode = modeById(Math.min(m.mode, this.maxMode))
          this.state = 'data'
          return
        }
      }
      if (this.calls >= this.opt.maxCalls) this.state = 'failed'
      return
    }
    if (this.state !== 'data') return
    const d = demodulate(samples, HANDSHAKE_MODE.afsk, this.fs)
    let got = false
    for (const f of d.frames) {
      const m = decodeMsg(f)
      if (m?.type !== Type.Ack || m.session !== this.session) continue
      got = true
      for (let i = 0; i < this.frames; i++) if (hasBit(m.map, i)) setBit(this.acked, i)
    }
    const n = this.confirmed
    if (n >= this.frames) {
      this.state = 'done'
      return
    }
    // pokrok? jinak zpomalit; po několika marných kolech se vzdát
    if (got && n > this.lastCount) this.stalls = 0
    else {
      this.stalls++
      if (this.stalls % 2 === 0 && this.mode.id > 0) this.mode = modeById(this.mode.id - 1)
      if (this.stalls >= this.opt.maxStalls) this.state = 'failed'
    }
    this.lastCount = n
  }
}

export interface ReceiverOptions {
  fs?: number
}

export class RadioReceiver {
  state: ReceiverState = 'idle'
  mode: Mode = HANDSHAKE_MODE
  /** naměřený odstup signálu při volání (dB) */
  snr?: number
  /** hotová zpráva */
  result?: Uint8Array
  /** zpráva došla celá, ale nesouhlasí CRC-32 (nemělo by nastat) */
  corrupt = false
  private fs: number
  private session = -1
  private total = 0
  private size = 0
  private crc = 0
  private maxMode = MODES.length - 1
  private got = new Map<number, Uint8Array>()
  private reply: Msg[] = []
  private replyListen = 0

  constructor(o: ReceiverOptions = {}) {
    this.fs = o.fs ?? SAMPLE_RATE
  }

  get received(): number {
    return this.got.size
  }
  get frames(): number {
    return this.total
  }

  private ackMsg(): Msg {
    const map = new Uint8Array(mapBytes(this.total))
    for (const i of this.got.keys()) setBit(map, i)
    return { type: Type.Ack, session: this.session, map }
  }

  /** Odpověď, kterou je třeba vysílat (READY, ACK), jinak undefined = jen poslouchat. */
  tx(): Tx | undefined {
    if (!this.reply.length) return undefined
    const msgs = this.reply.map(encodeMsg)
    const label = this.reply[0].type === Type.Ready ? 'Odpověď: připraven' : `Potvrzení ${this.got.size}/${this.total}`
    this.reply = []
    const audio = modulate(msgs, HANDSHAKE_MODE.afsk, this.fs)
    return { audio, listen: this.replyListen, label }
  }

  /** Nahrávka z okna poslechu. */
  rx(samples: Float32Array): void {
    // volání (nebo opakované volání, když se odpověď ztratila)
    const call = demodulate(samples, HANDSHAKE_MODE.afsk, this.fs)
    for (const f of call.frames) {
      const m = decodeMsg(f)
      if (m?.type !== Type.Call) continue
      if (this.state !== 'idle' && m.session !== this.session) continue
      if (this.state === 'idle') {
        this.session = m.session
        this.total = m.frames
        this.size = m.size
        this.crc = m.crc
        this.maxMode = m.maxMode
        this.got.clear()
        this.state = 'receiving'
      }
      this.snr = call.snr === undefined ? 0 : 10 * Math.log10(Math.max(call.snr, 1e-3))
      this.mode = chooseMode(this.snr, this.maxMode)
      this.reply = [
        { type: Type.Ready, session: this.session, snr: Math.max(-128, Math.min(127, Math.round(this.snr))), mode: this.mode.id },
      ]
      this.replyListen = BURST * (frameAir(CHUNK + 4, this.mode) + 0.02) + MARGIN * 2
      return
    }
    if (this.state === 'idle') return
    // data: nejdřív v očekávaném režimu, při nezdaru ve všech ostatních
    let any = false
    const order = [this.mode, ...MODES.filter((m) => m !== this.mode)]
    for (const m of order) {
      const d = demodulate(samples, m.afsk, this.fs)
      for (const f of d.frames) {
        const msg = decodeMsg(f)
        if (msg?.type !== Type.Data || msg.session !== this.session || msg.seq >= this.total) continue
        any = true
        if (!this.got.has(msg.seq)) {
          this.got.set(msg.seq, msg.data)
        }
      }
      if (any) {
        if (m !== this.mode) this.mode = m
        break
      }
    }
    if (!any) return
    if (this.got.size >= this.total && !this.result && !this.corrupt) this.finish()
    // potvrdit hned, i duplicitní dávku (odesílatel nemusel ACK slyšet)
    this.reply = [this.ackMsg()]
    this.replyListen = BURST * (frameAir(CHUNK + 4, this.mode) + 0.02) + MARGIN * 2
  }

  private finish() {
    const out = new Uint8Array(this.size)
    let at = 0
    for (let i = 0; i < this.total; i++) {
      const d = this.got.get(i)!
      out.set(d.subarray(0, Math.max(0, this.size - at)), at)
      at += d.length
    }
    if (at !== this.size || crc32(out) !== this.crc) {
      this.corrupt = true
      // začít znovu: zahodit vše a nechat odesílatele poslat rámce znovu
      this.got.clear()
      return
    }
    this.result = out
    this.state = 'complete'
  }
}
