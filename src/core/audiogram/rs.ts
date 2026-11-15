// Reed–Solomon nad GF(256) (polynom 0x11d, kořeny α^0…α^(nroots-1)), zkrácený kód: libovolná délka
// zprávy do 255 − nroots bajtů. Opraví až nroots/2 chybných bajtů v rámci. Chyba jednoho bitu zničí jen
// jeden bajt, proto kód dobře zvládá nezávislé bitové chyby (šum) i krátké shluky (výpadek několika symbolů).

const EXP = new Uint8Array(512)
const LOG = new Uint8Array(256)
;(() => {
  let x = 1
  for (let i = 0; i < 255; i++) {
    EXP[i] = x
    LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]
})()

const mul = (a: number, b: number) => (a && b ? EXP[LOG[a] + LOG[b]] : 0)
const div = (a: number, b: number) => (a ? EXP[LOG[a] + 255 - LOG[b]] : 0)

const genCache = new Map<number, Uint8Array>()
/** Generující polynom, koeficienty od nejvyššího stupně (první je 1). */
function generator(nroots: number): Uint8Array {
  let g = genCache.get(nroots)
  if (g) return g
  let p = [1]
  for (let i = 0; i < nroots; i++) {
    const q = new Array(p.length + 1).fill(0)
    for (let j = 0; j < p.length; j++) {
      q[j] ^= p[j]
      q[j + 1] ^= mul(p[j], EXP[i])
    }
    p = q
  }
  g = Uint8Array.from(p)
  genCache.set(nroots, g)
  return g
}

/** Doplní `nroots` kontrolních bajtů za data. */
export function rsEncode(data: Uint8Array, nroots: number): Uint8Array {
  if (nroots === 0) return data.slice()
  if (data.length + nroots > 255) throw new Error('Rámec je příliš dlouhý pro Reed–Solomon')
  const g = generator(nroots)
  const out = new Uint8Array(data.length + nroots)
  out.set(data)
  for (let i = 0; i < data.length; i++) {
    const c = out[i]
    if (c) for (let j = 1; j < g.length; j++) out[i + j] ^= mul(g[j], c)
  }
  out.set(data) // zbytek (kontrolní bajty) zůstal v out, data se vrátila
  return out
}

/**
 * Opraví slovo na místě. Vrací počet opravených bajtů, nebo -1, když je chyb víc, než kód zvládne
 * (nebo je oprava nedůvěryhodná).
 */
export function rsDecode(word: Uint8Array, nroots: number): number {
  if (nroots === 0) return 0
  const n = word.length
  const S = new Uint8Array(nroots)
  let clean = true
  for (let j = 0; j < nroots; j++) {
    let s = 0
    for (let i = 0; i < n; i++) s = mul(s, EXP[j]) ^ word[i]
    S[j] = s
    if (s) clean = false
  }
  if (clean) return 0
  // Berlekamp–Massey
  let C = [1]
  let B = [1]
  let L = 0
  let m = 1
  let b = 1
  for (let k = 0; k < nroots; k++) {
    let d = S[k]
    for (let i = 1; i <= L; i++) d ^= mul(C[i] ?? 0, S[k - i])
    if (d === 0) {
      m++
      continue
    }
    const T = C.slice()
    const coef = div(d, b)
    while (C.length < B.length + m) C.push(0)
    for (let i = 0; i < B.length; i++) C[i + m] ^= mul(coef, B[i])
    if (2 * L <= k) {
      L = k + 1 - L
      B = T
      b = d
      m = 1
    } else m++
  }
  if (L === 0 || L > nroots / 2) return -1
  // Chien: kořeny Λ(α^-p) = 0 → chyba na mocnině p (bajt n-1-p)
  const pos: number[] = []
  for (let p = 0; p < n; p++) {
    let v = 0
    for (let i = 0; i < C.length; i++) v ^= mul(C[i], EXP[(255 - p) * i % 255])
    if (v === 0) pos.push(p)
  }
  if (pos.length !== L) return -1
  // Ω = S·Λ mod x^nroots
  const omega = new Uint8Array(nroots)
  for (let i = 0; i < nroots; i++) for (let j = 0; j <= i && j < C.length; j++) omega[i] ^= mul(S[i - j], C[j])
  for (const p of pos) {
    const xinv = EXP[(255 - p) % 255]
    let num = 0
    for (let i = 0; i < nroots; i++) num ^= mul(omega[i], EXP[(LOG[xinv] * i) % 255])
    let den = 0
    for (let i = 1; i < C.length; i += 2) den ^= mul(C[i], EXP[(LOG[xinv] * (i - 1)) % 255])
    if (den === 0) return -1
    word[n - 1 - p] ^= mul(EXP[p % 255], div(num, den))
  }
  // kontrola: syndromy po opravě musí být nulové
  for (let j = 0; j < nroots; j++) {
    let s = 0
    for (let i = 0; i < n; i++) s = mul(s, EXP[j]) ^ word[i]
    if (s) return -1
  }
  return L
}
