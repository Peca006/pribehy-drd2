// Tenká vrstva nad Web Audio: přehrání zvuku a nahrávání z mikrofonu, a na ní běh odesílatele a příjemce.
// Vyžaduje https nebo localhost a povolení mikrofonu. Nahrávání jde přes ScriptProcessor (zastaralý, ale
// funguje všude a nepotřebuje samostatný soubor pro AudioWorklet); případný přechod na AudioWorklet viz RADIOGRAM.md.
// Echo cancellation, potlačení šumu a automatické ovládání zesílení se vypínají: kazí tóny.
import { RadioReceiver, RadioSender, type Tx } from './protocol'

export interface RadioStatus {
  /** krátký popis stavu pro rozhraní */
  text: string
  /** režim přenosu, až je znám */
  mode?: string
  /** odstup signálu (dB), až je změřen */
  snr?: number
  /** potvrzeno / celkem rámců */
  done?: number
  total?: number
}

export function audioSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof AudioContext !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia
  )
}

/** Zvuková relace: jeden AudioContext a mikrofon po celou dobu přenosu. */
export class AudioSession {
  ctx: AudioContext
  private stream?: MediaStream
  private source?: MediaStreamAudioSourceNode
  private proc?: ScriptProcessorNode
  private sink?: GainNode
  private chunks: Float32Array[] = []
  private listening = false

  constructor() {
    this.ctx = new AudioContext()
  }

  get fs(): number {
    return this.ctx.sampleRate
  }

  async open(): Promise<void> {
    await this.ctx.resume()
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    })
    this.source = this.ctx.createMediaStreamSource(this.stream)
    this.proc = this.ctx.createScriptProcessor(4096, 1, 1)
    // procesor musí být připojen k výstupu, jinak se nespustí; výstup je ale ztlumený (jinak by pískalo)
    this.sink = this.ctx.createGain()
    this.sink.gain.value = 0
    this.proc.onaudioprocess = (e) => {
      if (this.listening) this.chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)))
    }
    this.source.connect(this.proc)
    this.proc.connect(this.sink)
    this.sink.connect(this.ctx.destination)
  }

  close() {
    this.proc && (this.proc.onaudioprocess = null)
    this.stream?.getTracks().forEach((t) => t.stop())
    void this.ctx.close()
  }

  /** Přehraje zvuk; vyřeší se po dohrání. Během přehrávání se nenahrává (vlastní ozvěna by rušila). */
  play(samples: Float32Array): Promise<void> {
    this.listening = false
    const buf = this.ctx.createBuffer(1, samples.length, this.ctx.sampleRate)
    buf.copyToChannel(samples as Float32Array<ArrayBuffer>, 0)
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    src.connect(this.ctx.destination)
    return new Promise((resolve) => {
      src.onended = () => resolve()
      src.start()
    })
  }

  /** Nahrává dané sekundy a vrátí záznam. */
  async record(seconds: number, signal?: AbortSignal): Promise<Float32Array> {
    this.chunks = []
    this.listening = true
    await sleep(seconds * 1000, signal)
    this.listening = false
    return concat(this.chunks)
  }

  /**
   * Poslouchá, dokud nezačne a pak neskončí vysílání (úsek hluku následovaný tichem), nebo do `maxSeconds`.
   * Vrátí nahrávku nebo undefined (nic neslyšel). Nahrávka se při samém poslechu ořezává, ať neroste donekonečna.
   */
  async listenForBurst(maxSeconds: number, signal?: AbortSignal, quiet = 0.9): Promise<Float32Array | undefined> {
    this.chunks = []
    this.listening = true
    const t0 = performance.now()
    const block = 4096 / this.ctx.sampleRate
    let seen = 0
    let active = false
    let quietFor = 0
    let floor = 0
    let noise = 0.01
    try {
      while (performance.now() - t0 < maxSeconds * 1000) {
        await sleep(block * 1000, signal)
        while (seen < this.chunks.length) {
          const c = this.chunks[seen++]
          let e = 0
          for (const v of c) e += v * v
          const rms = Math.sqrt(e / c.length)
          // šum pozadí: pomalu se přizpůsobující minimum
          floor = floor ? Math.min(floor * 1.002, rms) || floor : rms
          noise = Math.max(0.006, floor * 3)
          if (rms > noise * 2) {
            active = true
            quietFor = 0
          } else if (active) quietFor += block
        }
        if (active && quietFor >= quiet) return concat(this.chunks)
        // bez aktivity zahazuj staré úseky (nechat poslední ~2 s pro začátek zvuku)
        if (!active && this.chunks.length > Math.ceil((2 * this.ctx.sampleRate) / 4096)) {
          this.chunks.shift()
          seen--
        }
      }
      return active ? concat(this.chunks) : undefined
    } finally {
      this.listening = false
    }
  }
}

function concat(parts: Float32Array[]): Float32Array {
  const out = new Float32Array(parts.reduce((s, p) => s + p.length, 0))
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.length
  }
  return out
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Zrušeno', 'AbortError'))
    const t = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t)
        reject(new DOMException('Zrušeno', 'AbortError'))
      },
      { once: true },
    )
  })
}

/** Vysílá zprávu zvukem, dokud ji příjemce nepotvrdí nebo se pokus nevzdá. Vrací true při úspěchu. */
export async function sendByAudio(
  message: Uint8Array,
  onStatus: (s: RadioStatus) => void,
  signal?: AbortSignal,
): Promise<boolean> {
  const s = new AudioSession()
  try {
    await s.open()
    const sender = new RadioSender(message, { fs: s.fs })
    for (;;) {
      const tx: Tx | undefined = sender.tx()
      if (!tx) break
      onStatus({
        text: tx.label,
        mode: sender.mode.name,
        snr: sender.remoteSnr,
        done: sender.confirmed,
        total: sender.frames,
      })
      await s.play(tx.audio)
      sender.rx(await s.record(tx.listen, signal))
    }
    onStatus({
      text: sender.state === 'done' ? 'Příjemce potvrdil přijetí.' : 'Příjemce neodpovídá, přenos se nezdařil.',
      mode: sender.mode.name,
      snr: sender.remoteSnr,
      done: sender.confirmed,
      total: sender.frames,
    })
    return sender.state === 'done'
  } finally {
    s.close()
  }
}

/**
 * Přijímá zprávu zvukem: čeká na volání, odpovídá a potvrzuje. Skončí, až je zpráva celá a po potvrzení se
 * chvíli nic neděje (odesílatel mohl potvrzení přeslechnout a poslal by dávku znovu), nebo po zrušení.
 */
export async function receiveByAudio(
  onStatus: (s: RadioStatus) => void,
  signal?: AbortSignal,
): Promise<Uint8Array | undefined> {
  const s = new AudioSession()
  try {
    await s.open()
    const rx = new RadioReceiver({ fs: s.fs })
    let idle = 0
    onStatus({ text: 'Čekám na volání…' })
    for (;;) {
      const rec = await s.listenForBurst(rx.state === 'complete' ? 6 : 120, signal)
      if (!rec) {
        if (rx.state === 'complete') break
        idle++
        // dlouho ticho po zahájení: pokračuj dál, ale dej o tom vědět
        if (rx.state === 'receiving' && idle > 2) onStatus({ text: 'Odesílatel mlčí, čekám…' })
        continue
      }
      idle = 0
      rx.rx(rec)
      const st = (text: string): RadioStatus => ({
        text,
        mode: rx.mode.name,
        snr: rx.snr,
        done: rx.received,
        total: rx.frames,
      })
      const tx = rx.tx()
      if (tx) {
        onStatus(st(tx.label))
        await s.play(tx.audio)
      }
      if (rx.state === 'complete') onStatus(st('Přijato celé, ověřeno.'))
    }
    return rx.result
  } finally {
    s.close()
  }
}
