// Rozpoznání příchozí zásilky: jedno místo pro text (kód `DRD2:`, JSON) i soubor (Háv). Díky tomu stačí jedno
// „Přijmout“ a uživatel nemusí vědět, kam jaký soubor patří. Vše se při rozpoznání zároveň očistí.
import type { Creature } from '../content/schema'
import { parseBundle } from '../creatures/bundle'
import { decodeJson, sanitizeBundle, type Bundle } from '../character/share'
import { sanitizeContent, type Content } from './content'

export type Incoming =
  /** výprava, dobrodružství nebo cizí postavy */
  | { kind: 'obsah'; content: Content }
  /** vlastní bytosti */
  | { kind: 'bestiar'; creatures: Creature[]; errors: string[] }
  /** revize postavy, odpověď vypravěče, družina, předpisy: mají vlastní postup v Importu postav */
  | { kind: 'postava'; bundle: Bundle }
  /** soubor Hávu (`.drdskin`, zip): zpracuje Šatník */
  | { kind: 'hav' }

export type Detected = { incoming?: Incoming; errors: string[] }

const ZIP_MAGIC = [0x50, 0x4b]

const isZip = (b: Uint8Array) => b.length > 4 && b[0] === ZIP_MAGIC[0] && b[1] === ZIP_MAGIC[1]

const BUNDLE_TYPES = new Set(['revize', 'odpoved', 'druzina', 'predpisy'])

/** Rozpozná text (kód, JSON) nebo bajty souboru. Nic se neukládá. */
export async function detectIncoming(input: string | Uint8Array): Promise<Detected> {
  if (typeof input !== 'string') {
    if (isZip(input)) return { incoming: { kind: 'hav' }, errors: [] }
    try {
      return detectIncoming(new TextDecoder('utf-8', { fatal: true }).decode(input))
    } catch {
      return { errors: ['Soubor nelze přečíst (není ani Háv, ani text zásilky).'] }
    }
  }
  const text = input.trim()
  if (!text) return { errors: [] }
  let raw: unknown
  try {
    raw = await decodeJson(text)
  } catch (e) {
    return {
      errors: [
        e instanceof Error && e.message.startsWith('Data jsou')
          ? e.message
          : 'Text nelze přečíst (poškozený, neúplný nebo to není zásilka z Příběhů).',
      ],
    }
  }
  const type = typeof raw === 'object' && raw !== null ? (raw as { type?: unknown }).type : undefined
  if (type === 'obsah') {
    const r = sanitizeContent(raw)
    return r.content ? { incoming: { kind: 'obsah', content: r.content }, errors: r.errors } : { errors: r.errors }
  }
  if (typeof type === 'string' && BUNDLE_TYPES.has(type)) {
    const r = sanitizeBundle(raw)
    return r.bundle ? { incoming: { kind: 'postava', bundle: r.bundle }, errors: r.errors } : { errors: r.errors }
  }
  // zbývá balíček bestiáře (včetně holého pole bytostí a jedné bytosti)
  const r = parseBundle(JSON.stringify(raw))
  if (r.creatures.length) return { incoming: { kind: 'bestiar', creatures: r.creatures, errors: r.errors }, errors: [] }
  return { errors: r.errors.length ? r.errors : ['Neznámý druh zásilky.'] }
}
