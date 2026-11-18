// Tenká vrstva nad Web Audio: přehrání zvuku a nahrávání z mikrofonu, a na ní běh odesílatele a příjemce.
// Vyžaduje https nebo localhost a povolení mikrofonu. Nahrávání jde přes ScriptProcessor (zastaralý, ale
// funguje všude a nepotřebuje samostatný soubor pro AudioWorklet); případný přechod na AudioWorklet viz AUDIOGRAM.md.
// Echo cancellation, potlačení šumu a automatické ovládání zesílení se vypínají: kazí tóny.
import { AudioReceiver, AudioSender, type Tx } from './protocol'

export interface AudioStatus {
  /** krátký popis stavu pro rozhraní */
  text: string
  /** režim přenosu, až je znám */
  mode?: string
  /** režim zvolil člověk (ne automatika) */
  forced?: boolean
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

/** Úroveň vstupu: špička a efektivní hodnota bloku (0 až 1, 1 = plná úroveň). */
export interface InputLevel {
  peak: number
  rms: number
}

/** Posouzení úrovně vstupu podle špičky: příliš slabé, v pořádku, nebo přebuzené (zkreslené). */
export function levelVerdict(peak: number): 'slabe' | 'dobre' | 'prebuzene' {
  return peak < 0.03 ? 'slabe' : peak > 0.95 ? 'prebuzene' : 'dobre'
}

/** Přihlásí odběr úrovně vstupu na relaci (hlášení asi desetkrát za sekundu, špička drží mezi hlášeními). */
function watchLevel(s: AudioSession, onLevel?: (l: InputLevel) => void) {
  if (!onLevel) return
  s.tap = (block) => {
    let peak = 0
    let e = 0
    for (let i = 0; i < block.length; i++) {
      const v = Math.abs(block[i])
      if (v > peak) peak = v
      e += v * v
    }
    onLevel({ peak, rms: Math.sqrt(e / (block.length || 1)) })
  }
}

/** Zapisovač protokolu přenosu: řádky s časem od začátku (s). */
export type LogFn = (line: string) => void

/** Úroveň záznamu: špička a efektivní hodnota v dB vůči plné amplitudě. */
function levelText(x: Float32Array): string {
  let peak = 0
  let e = 0
  for (let i = 0; i < x.length; i++) {
    const v = Math.abs(x[i])
    if (v > peak) peak = v
    e += v * v
  }
  const db = (a: number) => (a > 1e-6 ? Math.round(20 * Math.log10(a)) : -120)
  return `špička ${db(peak)} dB, efektivní ${db(Math.sqrt(e / (x.length || 1)))} dB`
}

/** Časovač protokolu: každý řádek dostane čas od vytvoření. */
function stamped(log?: LogFn): LogFn {
  const t0 = performance.now()
  return (line) => log?.(`${((performance.now() - t0) / 1000).toFixed(1).padStart(6)} s  ${line}`)
}

/** Popis zařízení a nastavení mikrofonu pro hlavičku protokolu. */
export function deviceText(info?: ReturnType<AudioSession['inputInfo']>): string {
  const f = (v: boolean | string | undefined) => (v === undefined ? '?' : v && v !== 'false' ? 'ano' : 'ne')
  return [
    `Verze ${__APP_VERSION__} · ${new Date().toLocaleString('cs-CZ')}`,
    navigator.userAgent,
    info
      ? `Vzorkování ${info.fs} Hz · potlačení ozvěny ${f(info.echoCancellation)} · potlačení šumu ${f(info.noiseSuppression)} · AGC ${f(info.autoGainControl)}`
      : '',
  ]
    .filter(Boolean)
    .join('\n')
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
  /** odposlech všech příchozích bloků zvuku (pro zkoušku zvuku a ukazatel hlasitosti) */
  tap?: (block: Float32Array) => void

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
      const block = e.inputBuffer.getChannelData(0)
      this.tap?.(block)
      if (this.listening) this.chunks.push(new Float32Array(block))
    }
    this.source.connect(this.proc)
    this.proc.connect(this.sink)
    this.sink.connect(this.ctx.destination)
  }

  /** Co mikrofon skutečně dělá: prohlížeč může požadavek na vypnutí úprav zvuku ignorovat. */
  inputInfo() {
    const t = this.stream?.getAudioTracks()[0]?.getSettings() as MediaTrackSettings | undefined
    return {
      fs: this.ctx.sampleRate,
      echoCancellation: t?.echoCancellation,
      noiseSuppression: t?.noiseSuppression,
      autoGainControl: t?.autoGainControl,
    }
  }

  close() {
    if (this.proc) this.proc.onaudioprocess = null
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
  async listenForBurst(maxSeconds: number, signal?: AbortSignal, quiet = 0.35): Promise<Float32Array | undefined> {
    this.chunks = []
    this.listening = true
    const t0 = performance.now()
    const block = 4096 / this.ctx.sampleRate
    let seen = 0
    let active = false
    let quietFor = 0
    let floor = 0
    let noise: number
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
  onStatus: (s: AudioStatus) => void,
  signal?: AbortSignal,
  /** vynucený režim (index do tabulky), jinak automaticky podle handshake */
  mode?: number,
  onLevel?: (l: InputLevel) => void,
  onLog?: LogFn,
): Promise<boolean> {
  const s = new AudioSession()
  const log = stamped(onLog)
  try {
    await s.open()
    watchLevel(s, onLevel)
    onLog?.(deviceText(s.inputInfo()))
    const sender = new AudioSender(message, { fs: s.fs, mode })
    log(`Vysílač: zpráva ${message.length} B, ${sender.frames} rámců, ${mode === undefined ? 'režim automaticky' : 'režim vynucen'}`)
    for (;;) {
      const tx: Tx | undefined = sender.tx()
      if (!tx) break
      onStatus({
        text: tx.label,
        mode: sender.mode.name,
        forced: mode !== undefined,
        snr: sender.remoteSnr,
        done: sender.confirmed,
        total: sender.frames,
      })
      const t0 = performance.now()
      await s.play(tx.audio)
      log(`Odvysíláno: ${tx.label} (${(tx.audio.length / s.fs).toFixed(1)} s zvuku, přehráno za ${((performance.now() - t0) / 1000).toFixed(1)} s)`)
      // poslech do první odpovědi (ne pevné okno): příjemce může s vyhodnocením chvíli otálet
      const rec = (await s.listenForBurst(tx.listen + 6, signal, 0.35)) ?? new Float32Array(0)
      const before = sender.confirmed
      const t1 = performance.now()
      sender.rx(rec)
      log(
        `Poslech: ${(rec.length / s.fs).toFixed(1)} s, ${rec.length ? levelText(rec) : 'nic neslyšel'}; ` +
          `vyhodnoceno za ${Math.round(performance.now() - t1)} ms; potvrzeno ${before} → ${sender.confirmed}/${sender.frames}, ` +
          `stav ${sender.state}, režim ${sender.mode.name}${sender.remoteSnr !== undefined ? `, odstup ${sender.remoteSnr} dB` : ''}`,
      )
    }
    onStatus({
      text: sender.state === 'done' ? 'Příjemce potvrdil přijetí.' : 'Příjemce neodpovídá, přenos se nezdařil.',
      mode: sender.mode.name,
      forced: mode !== undefined,
      snr: sender.remoteSnr,
      done: sender.confirmed,
      total: sender.frames,
    })
    log(`Konec: ${sender.state}`)
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
  onStatus: (s: AudioStatus) => void,
  signal?: AbortSignal,
  onLevel?: (l: InputLevel) => void,
  onLog?: LogFn,
): Promise<Uint8Array | undefined> {
  const s = new AudioSession()
  const log = stamped(onLog)
  try {
    await s.open()
    watchLevel(s, onLevel)
    onLog?.(deviceText(s.inputInfo()))
    log('Příjemce: čekám na volání')
    const rx = new AudioReceiver({ fs: s.fs })
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
      const before = rx.received
      const t1 = performance.now()
      rx.rx(rec)
      log(
        `Zachyceno ${(rec.length / s.fs).toFixed(1)} s, ${levelText(rec)}; vyhodnoceno za ${Math.round(performance.now() - t1)} ms; ` +
          `rámců ${before} → ${rx.received}/${rx.frames}, stav ${rx.state}, režim ${rx.mode.name}${rx.snr !== undefined ? `, odstup ${Math.round(rx.snr)} dB` : ''}`,
      )
      const st = (text: string): AudioStatus => ({
        text,
        mode: rx.state === 'idle' ? undefined : rx.mode.name,
        forced: rx.forced,
        snr: rx.snr,
        done: rx.received,
        total: rx.frames,
      })
      const tx = rx.tx()
      if (tx) {
        onStatus(st(tx.label))
        const t2 = performance.now()
        await s.play(tx.audio)
        log(`Odvysíláno: ${tx.label} (přehráno za ${((performance.now() - t2) / 1000).toFixed(1)} s)`)
      }
      if (rx.state === 'complete') onStatus(st('Přijato celé, ověřeno.'))
    }
    log(`Konec: ${rx.state}`)
    return rx.result
  } finally {
    s.close()
  }
}
