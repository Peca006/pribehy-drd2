// Sloučení různých tvarů téhož pojmu v rejstříku (sudba, sudbu, sudby, sudeb → Sudba). Čeština se skloňuje
// a časuje, plnohodnotný lematizátor tu není, proto jednoduchý postup nad slovní zásobou pojmů z jedné knihy:
//  1. úprava zápisu (malá písmena, bez číslic úrovně „bojovník 3“, bez „-li“ a zvratného „se“, ženské tvary povolání
//     a pár nepravidelných tvarů podle tabulky),
//  2. kmen slova: bez diacritiky, bez jedné koncovky (-ami, -ech, -ou, -a, -e, -i, …), na konci c → k,
//  3. tvary jednoho slova se spojí, když je kmen jednoho předponou kmene druhého a rozdíl je malý (jiz|jizv, plat|platb,
//     vyčerp|vyčerpávat); víceslovné pojmy se spojí jen při shodě kmenů všech slov.
// Základní tvar do rejstříku se vybírá podle koncovky a četnosti; kde to nevychází, rozhoduje tabulka `LEMMA`.

/** Koncovky odebírané z kmene, od nejdelších. */
const ENDINGS = [
  'ami', 'emi', 'imi', 'ymi', 'ich', 'ach', 'ech', 'ou', 'em', 'um', 'am', 'im', 'ym',
  'at', 'et', 'it', 'ev', 'eb', 'ek', 'a', 'e', 'i', 'o', 'u', 'y',
] // prettier-ignore
/**
 * Koncovky, u kterých tvar může být základním (1. pád jednotného čísla), od nejpřednějších: výzva, pouto, zdroj, duše.
 * „e“ jen bez háčku (výzvě je 3. pád) a jako poslední možnost (zdroje je množné číslo).
 */
const BASIC_ORDER = ['a', 'o', '', 'e']

/** Tvary, které pravidla nezvládnou (střídání samohlásek) a ženské podoby povolání → základní tvar. */
const IRREGULAR = {
  peněz: 'peníze',
  penězi: 'peníze',
  penězích: 'peníze',
  hodech: 'hod',
  bojovnice: 'bojovník',
  válečnice: 'válečník',
  kejklířka: 'kejklíř',
  lovkyně: 'lovec',
  lupička: 'lupič',
  mastičkářka: 'mastičkář',
  zaříkávačka: 'zaříkávač',
  hraničářka: 'hraničář',
  šamanka: 'šaman',
  vyzvědačka: 'zvěd',
  čarodějka: 'čaroděj',
  mágyně: 'mág',
  alchymistka: 'alchymista',
}

/** Základní tvar podle kmene skupiny tam, kde pravidlo (koncovka a četnost) vybere špatně. */
export const LEMMA = {
  pout: 'pouto',
  tel: 'tělo',
  hod: 'hod',
  vycerp: 'vyčerpání',
  postih: 'postih',
  vul: 'vůle',
}

/** Zápisy, které nejsou pojmem (poznámky o sazbě, spojky). */
const STOP = new Set(['na', 'tučnou kurzívu', 'velkým písmenem', 'uzlové'])
/** Nejvýše tolik slov má pojem; delší zápis je ukázka z textu. */
const MAX_WORDS = 3

export const unaccent = (s) => s.normalize('NFD').replace(/\p{M}+/gu, '')

/** Upravený zápis pojmu; prázdný řetězec = není pojem. */
export function cleanForm(raw) {
  const s = raw
    .toLowerCase()
    .replace(/[\s,:;)(.]+$/g, '')
    .replace(/^[\s,:;)(.]+/g, '')
    .replace(/\s+\d+$/, '')
    .replace(/-li$/, '')
    .replace(/\s+(se|si)$/, '')
    .replace(/\s+/g, ' ')
    .trim()
  const fixed = IRREGULAR[s] ?? s
  const bad =
    fixed.length < 3 ||
    STOP.has(fixed) ||
    fixed.includes(',') ||
    fixed.split(' ').length > MAX_WORDS
  return bad ? '' : fixed
}

/** Kmen jednoho slova a odebraná koncovka. */
export function stemWord(word) {
  let w = unaccent(word).replace(/^ne(?=vy)/, '')
  let ending = ''
  for (const e of ENDINGS) {
    // slovesné koncovky jen z delšího slova (střet není „str-et“)
    const min = e === 'at' || e === 'et' || e === 'it' ? 5 : e.length === 3 ? 4 : 3
    if (w.endsWith(e) && w.length - e.length >= min) {
      w = w.slice(0, -e.length)
      ending = e
      break
    }
  }
  return { stem: w.replace(/c$/, 'k'), ending }
}

/** Rozdíl délek kmenů, při kterém je delší kmen ještě tvarem téhož slova (u krátkých kmenů menší). */
const allowedDiff = (rootLen) => (rootLen < 5 ? 2 : 4)

/**
 * Rozdělí tvary pojmů do skupin. `counts`: upravený tvar → počet výskytů (u tvarů jen z vysvětlení pojmu 0).
 * `ties`: skupiny tvarů, které patří k sobě bez ohledu na kmen (pojem a aliasy z balíčku, viz `Term.aliases`).
 * Vrací tvar → `{ key, name }` (klíč skupiny a tvar do rejstříku, malými písmeny).
 */
export function groupForms(counts, ties = []) {
  const forms = [...counts.keys()]
  const info = new Map(
    forms.map((f) => {
      const parts = f.split(' ').map(stemWord)
      return [
        f,
        {
          stem: parts.map((p) => p.stem).join(' '),
          ending: parts.length === 1 ? parts[0].ending : null,
          multi: parts.length > 1,
        },
      ]
    }),
  )
  const stat = (f) => info.get(f) ?? { stem: '', ending: '', multi: false }
  // kořeny: nejkratší kmeny jednoslovných tvarů, které ostatní „pohltí“; víceslovné jen podle shody
  /** @type {string[]} */
  const roots = []
  const rootOf = new Map()
  const single = forms
    .filter((f) => !stat(f).multi)
    .sort((a, b) => stat(a).stem.length - stat(b).stem.length)
  for (const f of single) {
    const { stem } = stat(f)
    const root = roots.find(
      (r) => stem.startsWith(r) && stem.length - r.length <= allowedDiff(r.length),
    )
    if (root === undefined) roots.push(stem)
    rootOf.set(f, root ?? stem)
  }
  for (const f of forms.filter((f) => stat(f).multi)) rootOf.set(f, stat(f).stem)
  // pevné skupiny (pojem a jeho aliasy z balíčku) mají přednost před kmeny: celá skupina dostane kořen prvního tvaru
  /** @type {Map<string, Set<string>>} */
  const origRoots = new Map(forms.map((f) => [f, new Set([rootOf.get(f)])]))
  const orig = (f) => origRoots.get(f) ?? new Set()
  for (const tie of ties) {
    const present = tie.filter((f) => counts.has(f))
    if (present.length < 2) continue
    const target = rootOf.get(present[0])
    const merged = new Set(present.map((f) => rootOf.get(f)))
    for (const f of forms) {
      if (!merged.has(rootOf.get(f))) continue
      for (const r of orig(f)) orig(present[0]).add(r)
      rootOf.set(f, target)
    }
  }

  const byRoot = new Map()
  for (const f of forms) {
    const r = rootOf.get(f)
    if (!byRoot.has(r)) byRoot.set(r, [])
    byRoot.get(r).push(f)
  }
  const out = new Map()
  for (const [root, members] of byRoot) {
    const lemma = members.map((f) => [...orig(f)].map((r) => LEMMA[r]).find(Boolean)).find(Boolean)
    const byCount = (a, b) => counts.get(b) - counts.get(a) || a.localeCompare(b, 'cs')
    // nejpřednější koncovka z `BASIC_ORDER`, uvnitř ní nejčetnější tvar; bez takového tvaru nejčetnější vůbec
    const isBasic = (f, e) => !stat(f).multi && stat(f).ending === e && !(e === 'e' && /ě$/.test(f))
    const pick = BASIC_ORDER.map((e) => members.filter((f) => isBasic(f, e)).sort(byCount)[0]).find(
      Boolean,
    )
    const name = lemma ?? pick ?? [...members].sort(byCount)[0]
    for (const f of members) out.set(f, { key: root, name })
  }
  return out
}
