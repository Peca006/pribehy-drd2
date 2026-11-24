// Barvy pro skiny (Háv): vlastní přísný parser (žádné CSS.supports ani DOM, takže funguje i v testech a ve workeru)
// a kontrast podle WCAG 2.x. Podporované zápisy: #rgb, #rgba, #rrggbb, #rrggbbaa, rgb()/rgba(), hsl()/hsla()
// (čárkový i mezerový zápis). Pojmenované barvy (red, transparent, …) se záměrně nepřipouštějí.

export interface Rgba {
  r: number // 0–255
  g: number
  b: number
  a: number // 0–1
}

const NUM = /^[+-]?(\d+\.?\d*|\.\d+)$/

/** Číslo, nebo procento jako zlomek (`50%` → 0.5 při `scale` 1). Jinak null. */
function component(s: string, max: number): number | null {
  if (s.endsWith('%')) {
    const n = s.slice(0, -1)
    if (!NUM.test(n)) return null
    const p = Number(n)
    return p < 0 || p > 100 ? null : (p / 100) * max
  }
  if (!NUM.test(s)) return null
  const v = Number(s)
  return v < 0 || v > max ? null : v
}

function alpha(s: string | undefined): number | null {
  return s === undefined ? 1 : component(s, 1)
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hh = (((h % 360) + 360) % 360) / 60
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((hh % 2) - 1))
  const [r1, g1, b1] =
    hh < 1
      ? [c, x, 0]
      : hh < 2
        ? [x, c, 0]
        : hh < 3
          ? [0, c, x]
          : hh < 4
            ? [0, x, c]
            : hh < 5
              ? [x, 0, c]
              : [c, 0, x]
  const m = l - c / 2
  return [(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255]
}

export function parseColor(input: string): Rgba | null {
  const s = input.trim()
  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(s)
  if (hex) {
    let h = hex[1]!
    if (h.length <= 4) h = [...h].map((c) => c + c).join('')
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16)
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 }
  }
  const fn = /^(rgba?|hsla?)\(\s*([^()]*?)\s*\)$/i.exec(s)
  if (!fn) return null
  const parts = fn[2]!
    .replace('/', ' ')
    .split(/[\s,]+/)
    .filter(Boolean)
  if (parts.length !== 3 && parts.length !== 4) return null
  const a = alpha(parts[3])
  if (a === null) return null
  if (fn[1]!.toLowerCase().startsWith('rgb')) {
    const [r, g, b] = [
      component(parts[0]!, 255),
      component(parts[1]!, 255),
      component(parts[2]!, 255),
    ]
    return r === null || g === null || b === null ? null : { r, g, b, a }
  }
  const hueText = parts[0]!.replace(/deg$/i, '')
  if (!NUM.test(hueText) || !parts[1]!.endsWith('%') || !parts[2]!.endsWith('%')) return null
  const sat = component(parts[1]!, 1)
  const lig = component(parts[2]!, 1)
  if (sat === null || lig === null) return null
  const [r, g, b] = hslToRgb(Number(hueText), sat, lig)
  return { r, g, b, a }
}

function channel(v: number): number {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export function luminance(c: Rgba): number {
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b)
}

/** Průhlednou barvu `fg` položí na neprůhledné pozadí `bg`. */
export function composite(fg: Rgba, bg: Rgba): Rgba {
  return {
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  }
}

/** Poměr kontrastu 1–21 barvy `fg` (i průhledné) na neprůhledném pozadí `bg`. */
export function contrastRatio(fg: Rgba, bg: Rgba): number {
  const l1 = luminance(composite(fg, bg))
  const l2 = luminance(bg)
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1]
  return (hi + 0.05) / (lo + 0.05)
}
