// Tvary ploch z Hávu (M3b): panel, tlačítko a dialog mohou mít seříznuté rohy. Háv volí jen z výčtu (`rect`, `chamfer`,
// `notch`) a velikost (2 až 16 px); text `clip-path` vyrábí tento modul, takže z manifestu se do CSS nedostane nic volného.
// Ořez zakrývá i stín a roh rámečku z obrázku, tlačítka proto dostanou ohnisko (focus) uvnitř, aby nezmizelo.
import type { ThemeTokens } from '../theme'
import { lengthPx, type Shape, SHAPES } from './tokens'

const shapeOf = (v: string | undefined): Shape => SHAPES.find((s) => s === v) ?? 'rect'

/** `clip-path` pro tvar a velikost seříznutí v px; `rect` nemá nic (`null`). */
export function clipPath(shape: Shape, size: number): string | null {
  const s = `${Math.round(size)}px`
  switch (shape) {
    case 'chamfer':
      return `polygon(${s} 0, calc(100% - ${s}) 0, 100% ${s}, 100% calc(100% - ${s}), calc(100% - ${s}) 100%, ${s} 100%, 0 calc(100% - ${s}), 0 ${s})`
    case 'notch':
      return `polygon(${s} 0, 100% 0, 100% calc(100% - ${s}), calc(100% - ${s}) 100%, 0 100%, 0 ${s})`
    default:
      return null
  }
}

/** CSS proměnné `--drd-clip-panel|button|dialog` (a `--drd-focus-offset`) z tokenů tvaru; pro `rect` se vynechají. */
export function shapeVariables(tokens: Readonly<Record<string, string>>): ThemeTokens {
  const size = lengthPx(tokens['--drd-shape-size'] ?? '') ?? 6
  const out: ThemeTokens = {}
  for (const part of ['panel', 'button', 'dialog'] as const) {
    const shape = shapeOf(tokens[`--drd-shape-${part}`])
    const clip = clipPath(shape, size)
    if (!clip) continue
    out[`--drd-clip-${part}`] = clip
    // ohnisko tlačítka uvnitř, jinak by ho ořez uřízl
    if (part === 'button') out['--drd-focus-offset'] = '-3px'
  }
  return out
}
