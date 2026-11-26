// Švadlena, etapa 3: varianty podle viewportu (čisté funkce bez prohlížeče). Varianta má podmínku (šířka, orientace,
// nízký viewport) a přepisuje tokeny a role pro okna, která podmínku splňují. Varianty se uplatňují v pořadí, pozdější
// přepíše dřívější. Hodnoty se ověřují týmiž funkcemi jako při importu; neplatná změna Háv nezmění a vrátí důvod.
import type { Change } from './editor-assets'
import { validateRoles, type Role, type RoleName } from './roles'
import {
  ALL_VIEWPORTS,
  MAX_VARIANTS,
  viewportLabel,
  type Skin,
  type SkinVariant,
  type VariantWhen,
  type Viewport,
} from './skin'
import { tokenValueError, type TokenName } from './tokens'

const WIDTH_LABELS = { compact: 'úzký', medium: 'střední', expanded: 'široký' } as const

/** Okna (z 12 kombinací), pro která varianta platí. */
export function viewportsOf(when: VariantWhen): Viewport[] {
  return ALL_VIEWPORTS.filter(
    (v) =>
      (when.width === undefined || when.width === v.width) &&
      (when.orientation === undefined || when.orientation === v.orientation) &&
      (when.low === undefined || when.low === v.low),
  )
}

/** Popis podmínky pro rozhraní, např. „široký, na šířku“. */
export function whenLabel(when: VariantWhen): string {
  const parts: string[] = []
  if (when.width) parts.push(WIDTH_LABELS[when.width])
  if (when.orientation) parts.push(when.orientation === 'portrait' ? 'na výšku' : 'na šířku')
  if (when.low !== undefined) parts.push(when.low ? 'nízký' : 'ne nízký')
  return parts.join(', ') || 'všechna okna'
}

/** Souhrn pokrytí: ke každé ze 12 kombinací okna seznam čísel variant (od 1), které se na ni použijí. */
export function coverage(skin: Skin): { viewport: Viewport; label: string; variants: number[] }[] {
  return ALL_VIEWPORTS.map((viewport) => ({
    viewport,
    label: viewportLabel(viewport),
    variants: skin.variants.flatMap((v, i) => (viewportsOf(v.when).includes(viewport) ? [i + 1] : [])),
  }))
}

const noWhen = (when: VariantWhen) =>
  when.width === undefined && when.orientation === undefined && when.low === undefined

const withVariant = (skin: Skin, i: number, patch: Partial<SkinVariant>): Skin => ({
  ...skin,
  variants: skin.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)),
})

/** Přidá variantu na konec (platí nejdéle, přepíše dřívější). */
export function addVariant(skin: Skin, when: VariantWhen): Change {
  if (skin.variants.length >= MAX_VARIANTS) return { skin, error: `Nejvýše ${MAX_VARIANTS} variant.` }
  if (noWhen(when)) return { skin, error: 'Podmínka musí omezit šířku, orientaci nebo výšku okna.' }
  return { skin: { ...skin, variants: [...skin.variants, { when, tokens: {} }] }, error: null }
}

export const removeVariant = (skin: Skin, i: number): Skin => ({
  ...skin,
  variants: skin.variants.filter((_, j) => j !== i),
})

/** Posune variantu o jedno místo (`-1` dřív, `+1` později); mezní posun nic nezmění. */
export function moveVariant(skin: Skin, i: number, delta: -1 | 1): Skin {
  const to = i + delta
  if (to < 0 || to >= skin.variants.length) return skin
  const variants = [...skin.variants]
  const [v] = variants.splice(i, 1)
  variants.splice(to, 0, v!)
  return { ...skin, variants }
}

export function setVariantWhen(skin: Skin, i: number, when: VariantWhen): Change {
  if (!skin.variants[i]) return { skin, error: 'Varianta neexistuje.' }
  if (noWhen(when)) return { skin, error: 'Podmínka musí omezit šířku, orientaci nebo výšku okna.' }
  return { skin: withVariant(skin, i, { when }), error: null }
}

/** Nastaví přepsání tokenu ve variantě; prázdná hodnota přepsání odstraní. */
export function setVariantToken(skin: Skin, i: number, name: TokenName, raw: string): Change {
  const v = skin.variants[i]
  if (!v) return { skin, error: 'Varianta neexistuje.' }
  const value = raw.trim()
  if (value === '') {
    const { [name]: _drop, ...tokens } = v.tokens
    return { skin: withVariant(skin, i, { tokens }), error: null }
  }
  const error = tokenValueError(name, value)
  if (error) return { skin, error }
  return { skin: withVariant(skin, i, { tokens: { ...v.tokens, [name]: value } }), error: null }
}

/**
 * Nastaví roli ve variantě: role = nahrazuje základní, `null` = ve variantě roli vypne, `undefined` = varianta roli
 * nepřepisuje (platí základní). Role se ověřuje jako při importu.
 */
export function setVariantRole(
  skin: Skin,
  i: number,
  name: RoleName,
  role: Role | null | undefined,
): Change {
  const v = skin.variants[i]
  if (!v) return { skin, error: 'Varianta neexistuje.' }
  const { [name]: _drop, ...rest } = v.roles ?? {}
  if (role === undefined) return { skin: withVariant(skin, i, { roles: rest }), error: null }
  if (role === null) return { skin: withVariant(skin, i, { roles: { ...rest, [name]: null } }), error: null }
  let error: string | null = null
  const out = validateRoles(
    { [name]: role },
    'role',
    new Set(Object.keys(skin.assets)),
    (level, path, message) => {
      if (level === 'error' && !error) error = `${path.replace(/^role\./, '')}: ${message}`
    },
    true,
  )
  const checked = out[name]
  if (error || !checked) return { skin, error: error ?? 'neplatná role' }
  return { skin: withVariant(skin, i, { roles: { ...rest, [name]: checked } }), error: null }
}
