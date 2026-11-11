// Porovnání textu SRD (balíček) s textem PDF. Pracuje na úrovni znaků bez mezer, aby nevadilo zalomení
// slov a dělení slov v PDF; „pokrytí“ určují shodné úseky délky K.
const K = 12

/** Text bez značek mini-markdownu, interpunkce, mezer a rozdílů ve velikosti písmen. */
export function squash(text) {
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
}

/** Odstraní z textu PDF záhlaví stran („Část II. – …“) a čísla stran („-19-“). */
export function cleanPdfText(text) {
  return text
    .split('\f')
    .map((page) =>
      page
        .split('\n')
        .filter((l) => !/^\s*Část [IVX]+\.\s*[–-]/.test(l) && !/^\s*-\d+-\s*$/.test(l))
        .join('\n'),
    )
    .join('\n')
}

/** Plochý seznam textových úseků (odstavec, položka seznamu, řádek tabulky, nadpis). */
export function flattenBlocks(blocks, out = []) {
  for (const b of blocks) {
    if (b.type === 'p' || b.type === 'heading') out.push(b.text)
    else if (b.type === 'list') {
      const walk = (items) => items.forEach((i) => (out.push(i.text), i.items && walk(i.items)))
      walk(b.items)
    } else if (b.type === 'table') b.rows.forEach((r) => out.push(r.join(' ')))
    else if (b.type === 'quote') flattenBlocks(b.blocks, out)
    else if (b.type === 'card') (out.push(b.title), flattenBlocks(b.blocks, out))
  }
  return out
}

function shingles(s) {
  const set = new Set()
  for (let i = 0; i + K <= s.length; i++) set.add(s.slice(i, i + K))
  return set
}

/** Souvislé úseky nepokrytých znaků [start, end). */
function uncovered(s, other) {
  const cov = new Uint8Array(s.length)
  for (let i = 0; i + K <= s.length; i++) if (other.has(s.slice(i, i + K))) cov.fill(1, i, i + K)
  const out = []
  let start = -1
  for (let i = 0; i <= s.length; i++) {
    const c = i === s.length ? 1 : cov[i]
    if (!c && start < 0) start = i
    if (c && start >= 0) (out.push([start, i]), (start = -1))
  }
  return out
}

function editDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
  return dp[a.length][b.length]
}

export const KINDS = {
  number: 'ČÍSLO',
  typo: 'překlep/drobnost',
  wording: 'jiné znění',
  inserted: 'vložený text v PDF (sloupce/okraje)',
  layout: 'jiné pořadí v PDF (sloupce)',
  unanchored: 'nezakotveno / jen v SRD',
}

export function compare(pack, pdfRaw) {
  const pageStarts = []
  let pdf = ''
  for (const page of pdfRaw.split('')) {
    pageStarts.push(pdf.length)
    pdf += squash(cleanPdfText(page))
  }
  const pageOf = (pos) => pageStarts.filter((x) => x <= pos).length // číslo strany PDF (od 1)
  const pdfSet = shingles(pdf)
  const diffs = []
  const byChapter = {}
  const srdParts = []
  let total = 0

  for (const ch of pack.chapters) {
    for (const text of flattenBlocks(ch.blocks)) {
      const s = squash(text)
      if (!s) continue
      total++
      srdParts.push(s)
      if (s.length < K) {
        if (s.length >= 5 && !pdf.includes(s))
          add(ch.id, { text, kind: KINDS.unanchored, srd: s, pdf: undefined })
        continue
      }
      for (const [a, b] of uncovered(s, pdfSet)) {
        const left = a >= K ? s.slice(a - K, a) : undefined
        const right = b + K <= s.length ? s.slice(b, b + K) : undefined
        let pdfPart
        if (left && right) {
          let l = pdf.indexOf(left)
          while (l >= 0 && pdfPart === undefined) {
            const r = pdf.indexOf(right, l + K)
            if (r >= 0 && r - (l + K) <= b - a + 400) pdfPart = pdf.slice(l + K, r)
            l = pdf.indexOf(left, l + 1)
          }
        }
        const srd = s.slice(a, b)
        let kind
        // slovo je v PDF kousek za levou kotvou, jen proložené jiným sloupcem
        const nearby = left && srd.length >= 5 ? pdf.indexOf(srd, pdf.indexOf(left)) : -1
        const lpos = left ? pdf.indexOf(left) : -1
        if (pdfPart === undefined && lpos >= 0 && nearby >= 0 && nearby - lpos <= 700)
          kind = KINDS.layout
        else if (pdfPart === undefined) kind = KINDS.unanchored
        else if (pdfPart.length > srd.length + 25) kind = KINDS.inserted
        else if (/\d/.test(srd + pdfPart) && srd !== pdfPart) kind = KINDS.number
        else if (editDistance(srd, pdfPart) <= 2) kind = KINDS.typo
        else kind = KINDS.wording
        const ctx = (x) => s.slice(Math.max(0, a - 14), a) + '⟦' + x + '⟧' + s.slice(b, b + 14)
        add(ch.id, {
          text,
          kind,
          srd: ctx(srd),
          pdf: pdfPart === undefined ? undefined : ctx(pdfPart),
        })
      }
    }
  }

  function add(chapter, d) {
    diffs.push(d)
    ;(byChapter[chapter] ??= []).push(d)
  }

  // PDF -> SRD: úseky PDF (>= 60 znaků), které v SRD nejsou
  const srdSet = new Set()
  for (const p of srdParts) for (const k of shingles(p)) srdSet.add(k)
  const pdfOnly = uncovered(pdf, srdSet)
    .filter(([a, b]) => b - a >= 60)
    .map(
      ([a, b]) =>
        `[PDF s. ${pageOf(a)}] ` +
        pdf.slice(Math.max(0, a - 15), a) +
        '⟦' +
        pdf.slice(a, b).slice(0, 200) +
        '⟧',
    )
  return { total, diffs, byChapter, pdfOnly }
}
