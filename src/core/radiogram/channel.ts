// Simulovaný zvukový kanál pro testy (a ladění): bílý šum, zpoždění, zeslabení a výpadky.
// Generátor náhodných čísel je řízený semínkem, aby testy byly opakovatelné.

export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1
  return () => {
    // mulberry32
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(r() || 1e-12)) * Math.cos(2 * Math.PI * r())

export interface ChannelOptions {
  /** směrodatná odchylka šumu (signál má amplitudu ~0,7) */
  sigma?: number
  /** zpoždění ve vzorcích (ticho na začátku) */
  delay?: number
  /** zesílení (mikrofon bývá tišší) */
  gain?: number
  /** pravděpodobnost, že se vypadne úsek zvuku o délce `dropLen` vzorků (na každý vzorek) */
  dropRate?: number
  dropLen?: number
  seed?: number
}

export type Channel = (x: Float32Array) => Float32Array

export function makeChannel(o: ChannelOptions = {}): Channel {
  const r = rng(o.seed ?? 1)
  return (x) => {
    const delay = o.delay ?? 0
    const out = new Float32Array(x.length + delay + 2000)
    const g = o.gain ?? 1
    for (let i = 0; i < x.length; i++) out[i + delay] = x[i] * g
    if (o.sigma) for (let i = 0; i < out.length; i++) out[i] += o.sigma * gauss(r)
    if (o.dropRate) {
      const len = o.dropLen ?? 2000
      for (let i = 0; i < out.length; i++)
        if (r() < o.dropRate) out.fill(0, i, Math.min(out.length, i + len))
    }
    return out
  }
}
