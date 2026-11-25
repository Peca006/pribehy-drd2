// Ozdoby Hávu (M3c): obrázky kotvené k rohům okna. Kreslí se za obsahem a jen tehdy, když se vejdou do volného bočního
// okraje vedle sloupce obsahu, takže nikdy nepřekrývají text (na telefonu na výšku se tedy neukážou). Obrázek je nakreslený
// pro levý horní roh; pro ostatní kotvy ho aplikace zrcadlí. Manifest dává jen kotvu, název obrázku a šířku v px.

export const ORNAMENT_ANCHORS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const
export type OrnamentAnchor = (typeof ORNAMENT_ANCHORS)[number]

export const MAX_ORNAMENTS = 8
export const MIN_ORNAMENT_WIDTH = 16
export const MAX_ORNAMENT_WIDTH = 192
/** odstup ozdoby od okraje okna a od obsahu (px) */
export const ORNAMENT_GAP = 8

export interface Ornament {
  /** název obrázku z `assets`, nakreslený pro levý horní roh */
  image: string
  anchor: OrnamentAnchor
  /** šířka na obrazovce v px (výška podle poměru obrázku) */
  width: number
}

type Report = (level: 'error' | 'warning', path: string, message: string) => void

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** Ověří seznam ozdob; vrací jen platné (chyby jsou ohlášeny). */
export function validateOrnaments(
  raw: unknown,
  path: string,
  assetNames: ReadonlySet<string>,
  report: Report,
): Ornament[] {
  if (raw === undefined) return []
  if (!Array.isArray(raw)) {
    report('error', path, 'ozdoby musí být pole')
    return []
  }
  if (raw.length > MAX_ORNAMENTS) report('error', path, `nejvýše ${MAX_ORNAMENTS} ozdob`)
  const out: Ornament[] = []
  raw.slice(0, MAX_ORNAMENTS).forEach((o: unknown, i) => {
    const p = `${path}[${i}]`
    if (!isObject(o)) return report('error', p, 'ozdoba musí být objekt')
    for (const key of Object.keys(o))
      if (!['image', 'anchor', 'width'].includes(key))
        report('warning', `${p}.${key}`, 'neznámá položka se ignoruje')
    let ok = true
    const bad = (field: string, message: string) => {
      report('error', `${p}.${field}`, message)
      ok = false
    }
    if (typeof o.image !== 'string' || !assetNames.has(o.image))
      bad('image', 'chybí obrázek (název z assets)')
    if (typeof o.anchor !== 'string' || !(ORNAMENT_ANCHORS as readonly string[]).includes(o.anchor))
      bad('anchor', `kotva musí být jedna z: ${ORNAMENT_ANCHORS.join(', ')}`)
    const w = o.width
    if (
      typeof w !== 'number' ||
      !Number.isInteger(w) ||
      w < MIN_ORNAMENT_WIDTH ||
      w > MAX_ORNAMENT_WIDTH
    )
      bad('width', `celé číslo ${MIN_ORNAMENT_WIDTH} až ${MAX_ORNAMENT_WIDTH}`)
    if (ok)
      out.push({ image: o.image as string, anchor: o.anchor as OrnamentAnchor, width: w as number })
  })
  return out
}

/** Rozměry okna a sloupce obsahu v px (měří je aplikace). */
export interface Geometry {
  viewportWidth: number
  /** vodorovný rozsah stránky (bez svislého pruhu lišty) a sloupce obsahu v ní */
  pageLeft: number
  pageRight: number
  mainLeft: number
  mainRight: number
  /** svislá místa zabraná lištou nahoře a dole (px od okraje okna) */
  topInset: number
  bottomInset: number
}

export interface PlacedOrnament {
  ornament: Ornament
  /** odstup od levého nebo pravého a od horního nebo dolního okraje okna v px (podle kotvy) */
  x: number
  y: number
}

/** Ozdoby, které se vejdou do volného bočního okraje; ostatní se vynechají (nikdy nepřekryjí obsah). */
export function placeOrnaments(ornaments: readonly Ornament[], g: Geometry): PlacedOrnament[] {
  const freeLeft = g.mainLeft - g.pageLeft
  const freeRight = g.pageRight - g.mainRight
  const out: PlacedOrnament[] = []
  for (const ornament of ornaments) {
    const left = ornament.anchor.endsWith('left')
    const free = left ? freeLeft : freeRight
    if (ornament.width + 2 * ORNAMENT_GAP > free) continue
    out.push({
      ornament,
      x: left ? g.pageLeft + ORNAMENT_GAP : g.viewportWidth - g.pageRight + ORNAMENT_GAP,
      y: ornament.anchor.startsWith('top')
        ? g.topInset + ORNAMENT_GAP
        : g.bottomInset + ORNAMENT_GAP,
    })
  }
  return out
}
