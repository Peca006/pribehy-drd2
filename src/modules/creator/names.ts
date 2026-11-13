// Triviální generátor jmen: markovský řetězec 2. řádu nad písmeny příkladů jednoho štítku
// (např. „Muži“). Sám žádná jména neobsahuje – čerpá jen z příkladů nainstalovaného balíčku.
// Víceslovná jména (např. jméno a příjmení) se skládají po slovech, každé podle slov na stejné pozici.

export interface NameExamples {
  label: string
  list: string[]
}

const START = '^'
const END = '$'
const MAX_TRIES = 30

function pick<T>(items: T[], rng: () => number): T {
  return items[Math.min(items.length - 1, Math.floor(rng() * items.length))]
}

/** Jedno slovo z řetězce přechodů; `undefined`, když se nepovedlo nic rozumného. */
function generateWord(words: string[], rng: () => number): string | undefined {
  const next = new Map<string, string[]>()
  for (const w of words) {
    const chars = [START, START, ...w.toLowerCase(), END]
    for (let i = 2; i < chars.length; i++) {
      const key = chars[i - 2] + chars[i - 1]
      const arr = next.get(key) ?? []
      arr.push(chars[i])
      next.set(key, arr)
    }
  }
  const known = new Set(words.map((w) => w.toLowerCase()))
  for (let t = 0; t < MAX_TRIES; t++) {
    let out = ''
    let key = START + START
    while (out.length < 20) {
      const c = pick(next.get(key) ?? [END], rng)
      if (c === END) break
      out += c
      key = key[1] + c
    }
    if (out.length >= 3 && !known.has(out)) return out[0].toUpperCase() + out.slice(1)
  }
  return undefined
}

/**
 * Vymyslí nové jméno v rázu příkladů. Bez `label` se použije náhodný štítek.
 * Vrací `undefined`, pokud nejsou příklady (nebo se nepodařilo nic nového složit).
 */
export function generateName(
  examples: NameExamples[],
  rng: () => number = Math.random,
  label?: string,
): string | undefined {
  const usable = examples.filter((e) => e.list.some((n) => n.trim()))
  if (!usable.length) return undefined
  const set = (label !== undefined && usable.find((e) => e.label === label)) || pick(usable, rng)
  const names = set.list.map((n) => n.trim().split(/\s+/)).filter((p) => p.length && p[0])
  if (!names.length) return undefined
  const parts = pick(names, rng).length
  const known = new Set(set.list.map((n) => n.trim().toLowerCase()))
  for (let t = 0; t < MAX_TRIES; t++) {
    const out: string[] = []
    for (let i = 0; i < parts; i++) {
      const words = names.map((n) => n[i]).filter(Boolean)
      // u malé sady občas nejde slovo nově složit: u víceslovných jmen se pak vezme příkladové
      const w = generateWord(words, rng) ?? (parts > 1 ? pick(words, rng) : undefined)
      if (!w) return undefined
      out.push(w)
    }
    const name = out.join(' ')
    if (!known.has(name.toLowerCase())) return name
  }
  return undefined
}
