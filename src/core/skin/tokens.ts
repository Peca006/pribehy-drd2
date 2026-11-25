// Sada tokenů, které smí Háv nastavit, a validace jejich hodnot. Háv je komunitní vstup, tedy nedůvěryhodný:
// hodnota se nikdy nevkládá do textu CSS neověřená. Každý typ má vlastní přísný zápis (žádné `url()`, `var()`,
// `calc()`, `;`, `{`, `}`, komentáře ani zpětná lomítka) a rozumné meze, aby Háv nešlo rozbít (nulové mezery, obří písmo).
import { parseColor } from './color'

export const TOKEN_NAMES = [
  '--drd-bg',
  '--drd-surface',
  '--drd-text',
  '--drd-text-muted',
  '--drd-border',
  '--drd-accent',
  '--drd-danger',
  '--drd-success',
  '--drd-warning',
  '--drd-scrim',
  '--drd-shadow',
  '--drd-text-shadow',
  '--drd-radius',
  '--drd-gap',
  '--drd-font',
  '--drd-nav-position',
  '--drd-shape-panel',
  '--drd-shape-button',
  '--drd-shape-dialog',
  '--drd-shape-size',
] as const

export type TokenName = (typeof TOKEN_NAMES)[number]

type TokenSpec =
  | { kind: 'color'; /** plochy a text pod ním musí být neprůhledné */ opaque: boolean }
  | { kind: 'length'; /** meze v px (1 rem = 16 px) */ min: number; max: number }
  | { kind: 'font' }
  | { kind: 'shadow' }
  | { kind: 'textShadow' }
  | { kind: 'enum'; values: readonly string[] }

/** Poloha hlavní lišty: dole (výchozí), nahoře, svislý pruh vlevo nebo vpravo. */
export const NAV_POSITIONS = ['bottom', 'top', 'left', 'right'] as const
export type NavPosition = (typeof NAV_POSITIONS)[number]

/** Tvar plochy: obdélník, seříznuté všechny čtyři rohy (`chamfer`), nebo jen levý horní a pravý dolní (`notch`). */
export const SHAPES = ['rect', 'chamfer', 'notch'] as const
export type Shape = (typeof SHAPES)[number]

const COLOR = { kind: 'color', opaque: true } as const

export const TOKEN_SPECS: Record<TokenName, TokenSpec> = {
  '--drd-bg': COLOR,
  '--drd-surface': COLOR,
  '--drd-text': COLOR,
  '--drd-text-muted': COLOR,
  '--drd-border': COLOR,
  '--drd-accent': COLOR,
  '--drd-danger': COLOR,
  '--drd-success': COLOR,
  '--drd-warning': COLOR,
  '--drd-scrim': { kind: 'color', opaque: false },
  '--drd-shadow': { kind: 'shadow' },
  '--drd-text-shadow': { kind: 'textShadow' },
  '--drd-radius': { kind: 'length', min: 0, max: 48 },
  '--drd-gap': { kind: 'length', min: 4, max: 32 },
  '--drd-font': { kind: 'font' },
  '--drd-nav-position': { kind: 'enum', values: NAV_POSITIONS },
  '--drd-shape-panel': { kind: 'enum', values: SHAPES },
  '--drd-shape-button': { kind: 'enum', values: SHAPES },
  '--drd-shape-dialog': { kind: 'enum', values: SHAPES },
  '--drd-shape-size': { kind: 'length', min: 2, max: 16 },
}

export const MAX_VALUE_LENGTH = 200

export const isTokenName = (name: string): name is TokenName =>
  Object.prototype.hasOwnProperty.call(TOKEN_SPECS, name)

/** Rozdělí text na nejvyšší úrovni závorek podle oddělovače; při nevyvážených závorkách vrátí null. */
function splitTopLevel(s: string, isSep: (ch: string) => boolean): string[] | null {
  const out: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of s) {
    if (ch === '(') depth++
    else if (ch === ')' && --depth < 0) return null
    if (depth === 0 && isSep(ch)) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  if (depth !== 0) return null
  out.push(cur)
  return out.filter((p) => p.trim() !== '').map((p) => p.trim())
}

const LENGTH = /^(-?(?:\d+\.?\d*|\.\d+))(px|rem|em)?$/

/** Délka v px; bezrozměrná je povolená jen nula. `em` se bere jako 16 px. */
export function lengthPx(s: string): number | null {
  const m = LENGTH.exec(s)
  if (!m) return null
  const n = Number(m[1])
  if (!m[2]) return n === 0 ? 0 : null
  return m[2] === 'px' ? n : n * 16
}

const GENERIC_FONTS = new Set([
  'system-ui',
  'ui-sans-serif',
  'ui-serif',
  'ui-monospace',
  'sans-serif',
  'serif',
  'monospace',
])
const QUOTED_FONT = /^(['"])[A-Za-z0-9][A-Za-z0-9 .-]{0,40}\1$/
const BARE_FONT = /^[A-Za-z][A-Za-z0-9-]{0,40}$/

function fontError(value: string): string | null {
  const families = splitTopLevel(value, (c) => c === ',')
  if (!families || families.length === 0 || families.length > 8)
    return 'seznam písem musí mít 1 až 8 položek'
  for (const f of families) {
    if (!(GENERIC_FONTS.has(f) || QUOTED_FONT.test(f) || BARE_FONT.test(f))) {
      return `neplatný název písma „${f}“ (víceslovné názvy patří do uvozovek, povoleno jen systémová písma)`
    }
  }
  if (!GENERIC_FONTS.has(families[families.length - 1]!)) {
    return 'poslední písmo musí být obecná rodina (sans-serif, serif, monospace nebo system-ui)'
  }
  return null
}

/** `text`: stín textu (`text-shadow`), který nezná `inset` a rozšíření, má tedy 2 až 3 délky. */
function shadowError(value: string, text = false): string | null {
  if (value === 'none') return null
  const layers = splitTopLevel(value, (c) => c === ',')
  if (!layers || layers.length === 0 || layers.length > 3)
    return 'stín musí mít 1 až 3 vrstvy (nebo none)'
  for (const layer of layers) {
    const parts = splitTopLevel(layer, (c) => /\s/.test(c))
    if (!parts) return 'neplatný zápis stínu'
    let colors = 0
    const lengths: number[] = []
    for (const p of parts) {
      if (p === 'inset') {
        if (text) return 'stín textu nemůže být vnitřní (inset)'
        continue
      }
      if (parseColor(p)) colors++
      else {
        const px = lengthPx(p)
        if (px === null) return `neplatná část stínu „${p}“`
        lengths.push(px)
      }
    }
    if (colors !== 1) return 'každá vrstva stínu musí mít právě jednu barvu'
    const maxLengths = text ? 3 : 4
    if (lengths.length < 2 || lengths.length > maxLengths)
      return text
        ? 'vrstva stínu textu má mít 2 až 3 délky (posun x, y, rozostření)'
        : 'vrstva stínu má mít 2 až 4 délky (posun x, y, rozostření, rozšíření)'
    if (lengths.some((n) => Math.abs(n) > 64)) return 'rozměry stínu mohou být nejvýše 64 px'
    if ((lengths[2] ?? 0) < 0) return 'rozostření stínu nesmí být záporné'
  }
  return null
}

/** Vrátí text chyby, nebo null, je-li hodnota pro token platná. */
export function tokenValueError(name: TokenName, value: unknown): string | null {
  if (typeof value !== 'string') return 'hodnota musí být text'
  const v = value.trim()
  if (v === '' || v.length > MAX_VALUE_LENGTH)
    return `hodnota musí mít 1 až ${MAX_VALUE_LENGTH} znaků`
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f;{}\\@<>]|\/\*|url\(|var\(|calc\(|expression|import/i.test(v)) {
    return 'hodnota obsahuje nepovolené znaky nebo funkci'
  }
  const spec = TOKEN_SPECS[name]
  switch (spec.kind) {
    case 'color': {
      const c = parseColor(v)
      if (!c) return 'neplatná barva (povoleno #rgb, #rrggbb, #rrggbbaa, rgb(), hsl())'
      return spec.opaque && c.a < 1 ? 'barva musí být neprůhledná' : null
    }
    case 'length': {
      const px = lengthPx(v)
      if (px === null) return 'neplatná délka (povoleno px, rem, em)'
      return px < spec.min || px > spec.max
        ? `délka musí být v rozmezí ${spec.min} až ${spec.max} px`
        : null
    }
    case 'font':
      return fontError(v)
    case 'shadow':
      return shadowError(v)
    case 'textShadow':
      return shadowError(v, true)
    case 'enum':
      return spec.values.includes(v) ? null : `povoleno: ${spec.values.join(', ')}`
  }
}
