import { describe, expect, it } from 'vitest'
import { SAMPLE_RATE } from './afsk'
import { makeChannel, rng, type Channel } from './channel'
import { RadioReceiver, RadioSender } from './protocol'

const bytesOf = (n: number, seed = 5) => {
  const r = rng(seed)
  return Uint8Array.from({ length: n }, () => Math.floor(r() * 256))
}

interface Result {
  sender: RadioSender
  receiver: RadioReceiver
  /** celková doba vysílání obou stran (s) */
  seconds: number
  turns: number
  labels: string[]
}

/** Poloduplexní běh obou stran přes dva simulované kanály. */
function run(msg: Uint8Array, ab: Channel, ba: Channel, opt: { maxMode?: number; maxTurns?: number } = {}): Result {
  const sender = new RadioSender(msg, { session: 42, maxMode: opt.maxMode })
  const receiver = new RadioReceiver()
  let seconds = 0
  let turns = 0
  const labels: string[] = []
  const silence = new Float32Array(SAMPLE_RATE)
  while (turns < (opt.maxTurns ?? 200)) {
    const t = sender.tx()
    if (!t) break
    turns++
    labels.push(t.label)
    seconds += t.audio.length / SAMPLE_RATE
    receiver.rx(ab(t.audio))
    const r = receiver.tx()
    if (r) {
      labels.push(r.label)
      seconds += r.audio.length / SAMPLE_RATE
      sender.rx(ba(r.audio))
    } else sender.rx(silence)
  }
  return { sender, receiver, seconds, turns, labels }
}

describe('protokol: volání, odpověď, data, potvrzení', () => {
  it('čistý kanál: zpráva dojde celá, odesílatel dostane potvrzení, zvolí se nejrychlejší režim', () => {
    const msg = bytesOf(700)
    const r = run(msg, makeChannel({ delay: 3000 }), makeChannel({ delay: 1000 }))
    expect(r.sender.state).toBe('done')
    expect(r.receiver.state).toBe('complete')
    expect(r.receiver.result).toEqual(msg)
    expect(r.sender.mode.name).toBe('AFSK 1200')
    expect(r.labels[0]).toBe('Volání')
    expect(r.labels[1]).toBe('Odpověď: připraven')
    expect(r.labels.at(-1)).toMatch(/^Potvrzení 15\/15/)
  })

  it('prázdná a jednorámcová zpráva', () => {
    for (const n of [0, 1, 48, 49]) {
      const msg = bytesOf(n, n + 1)
      const r = run(msg, makeChannel(), makeChannel())
      expect(r.receiver.result, `n=${n}`).toEqual(msg)
      expect(r.sender.state).toBe('done')
    }
  })

  it('střední šum: handshake zvolí pomalejší režim a zpráva dojde', () => {
    const msg = bytesOf(500)
    const r = run(msg, makeChannel({ sigma: 0.8, seed: 3 }), makeChannel({ sigma: 0.8, seed: 4 }))
    expect(r.receiver.result).toEqual(msg)
    expect(r.sender.state).toBe('done')
    expect(r.receiver.snr).toBeLessThan(18)
  })

  it('ztráta rámců: výpadky zvuku se opraví opakováním jen chybějících rámců', () => {
    const msg = bytesOf(900)
    // zhruba každý několikátý rámec zmizí; zpětný kanál (ACK) je čistý
    const r = run(msg, makeChannel({ dropRate: 0.00001, dropLen: 5000, seed: 8 }), makeChannel(), { maxMode: 1 })
    expect(r.receiver.result).toEqual(msg)
    expect(r.sender.state).toBe('done')
    // víc kol než u čistého kanálu (volání + 2 dávky), tedy opakování proběhlo
    expect(r.turns).toBeGreaterThan(3)
  })

  it('ztracené volání a ztracená odpověď: volání se opakuje', () => {
    const msg = bytesOf(100)
    let n = 0
    const lossyAB: Channel = (x) => (n++ === 0 ? new Float32Array(x.length) : x)
    let m = 0
    const lossyBA: Channel = (x) => (m++ === 0 ? new Float32Array(x.length) : x)
    const r = run(msg, lossyAB, lossyBA)
    expect(r.receiver.result).toEqual(msg)
    expect(r.sender.state).toBe('done')
  })

  it('ztracené potvrzení: odesílatel pošle dávku znovu a příjemce ji potvrdí znovu', () => {
    const msg = bytesOf(300)
    let m = 0
    // druhá odpověď příjemce (první ACK) se ztratí
    const ba: Channel = (x) => (m++ === 1 ? new Float32Array(x.length) : x)
    const r = run(msg, makeChannel(), ba)
    expect(r.receiver.result).toEqual(msg)
    expect(r.sender.state).toBe('done')
  })

  it('mrtvý kanál: odesílatel to po několika pokusech vzdá', () => {
    const dead: Channel = (x) => new Float32Array(x.length)
    const r = run(bytesOf(100), dead, dead)
    expect(r.sender.state).toBe('failed')
    expect(r.receiver.state).toBe('idle')
  })

  it('zpoždění a tichý mikrofon nevadí', () => {
    const msg = bytesOf(300)
    const r = run(msg, makeChannel({ delay: 20000, gain: 0.05 }), makeChannel({ delay: 777, gain: 0.1 }))
    expect(r.receiver.result).toEqual(msg)
  })

  it('odhad doby: nejrychlejší režim je výrazně rychlejší než nejpomalejší', () => {
    const msg = bytesOf(960)
    const fast = run(msg, makeChannel(), makeChannel())
    const slow = run(msg, makeChannel(), makeChannel(), { maxMode: 0 })
    expect(slow.receiver.result).toEqual(msg)
    expect(fast.seconds).toBeLessThan(slow.seconds / 2)
    console.log(`960 B: AFSK 1200 ${fast.seconds.toFixed(1)} s, AFSK 300 ${slow.seconds.toFixed(1)} s`)
  })
})
