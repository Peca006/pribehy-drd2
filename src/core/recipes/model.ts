// Předpisy (kouzla, později lektvary, jedy, nástrahy a výrobky) uložené v Grimoáru hráče.
//
// Normalizovaný model:
//  - předpis je jedna instance v úložišti `recipes` se stabilním `id`; postavy se na něj jen odkazují
//    (`Character.recipeLinks`), kopie se nedělají,
//  - `contentHash` je otisk obsahu (SHA-256 z kanonického tvaru) a slouží k rychlému porovnání a deduplikaci
//    při importu; identitu určuje `id`, ne hash (úprava textu předpis nemění v jiný),
//  - stav vázaný na konkrétní postavu (zásoba lektvaru, vložené Zdroje do kouzla, substance) není v předpisu,
//    ale v odkazu postavy (`RecipeLink.state`).
import { sha256Hex } from '../hash'

export const RECIPE_KINDS = ['kouzlo', 'lektvar', 'jed', 'nastraha', 'vyrobek'] as const
export type RecipeKind = (typeof RECIPE_KINDS)[number]

export const RECIPE_KIND_LABELS: Record<RecipeKind, string> = {
  kouzlo: 'Kouzlo',
  lektvar: 'Lektvar',
  jed: 'Jed',
  nastraha: 'Nástraha',
  vyrobek: 'Výrobek',
}

export type ParamValue = string | number | boolean
export type RecipeParams = Record<string, ParamValue>

export interface Recipe {
  id: string
  kind: RecipeKind
  name: string
  description: string
  /** parametry podle druhu (u kouzla např. obor, rituál, dosah, rozsah, trvání, náročnost) */
  params: RecipeParams
  /** otisk obsahu (druh, název, popis, parametry); při ukládání se vždy přepočítá */
  contentHash: string
  /** čas poslední úpravy (ISO); do otisku nevstupuje */
  updatedAt: string
}

/** Vstup pro vytvoření nebo úpravu předpisu (otisk a čas doplní úložiště). */
export type RecipeInput = Pick<Recipe, 'kind' | 'name'> &
  Partial<Pick<Recipe, 'description' | 'params'>>

/** Odkaz postavy na předpis a stav, který je vázaný na tuto postavu. */
export interface RecipeLink {
  recipeId: string
  state: Record<string, number | string>
}

export const MAX_NAME = 120
export const MAX_DESCRIPTION = 4000
export const MAX_PARAMS = 30
export const MAX_PARAM_KEY = 40
export const MAX_PARAM_VALUE = 500
export const MAX_RECIPES = 2000
export const MAX_LINKS = 200
export const MAX_STATE = 20

/** Text v kanonickém tvaru: Unicode NFC, jednotné konce řádků, oříznuté okraje řádků i celku. */
export const canonText = (s: unknown, max = MAX_DESCRIPTION): string =>
  typeof s === 'string'
    ? s
        .normalize('NFC')
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map((l) => l.trimEnd())
        .join('\n')
        .trim()
        .slice(0, max)
    : ''

/** Název: jako text, navíc se souvislé mezery a zalomení sloučí na jednu mezeru. */
export const canonName = (s: unknown): string =>
  typeof s === 'string' ? s.normalize('NFC').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME) : ''

/** Očištěné parametry: jen skaláry, texty v kanonickém tvaru, prázdné hodnoty se vynechají, omezený počet. */
export function canonParams(raw: unknown): RecipeParams {
  const out: RecipeParams = {}
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return out
  for (const [k, v] of Object.entries(raw)) {
    if (Object.keys(out).length >= MAX_PARAMS) break
    if (k.length === 0 || k.length > MAX_PARAM_KEY || k.includes('.')) continue
    if (typeof v === 'string') {
      const t = canonText(v, MAX_PARAM_VALUE)
      if (t) out[k] = t
    } else if (typeof v === 'number') {
      if (Number.isFinite(v)) out[k] = v
    } else if (v === true) out[k] = true // nepravda je totéž co chybějící hodnota
  }
  return out
}

/** Kanonický tvar obsahu, ze kterého se počítá otisk (klíče parametrů seřazené). */
export function canonical(r: Pick<Recipe, 'kind' | 'name' | 'description' | 'params'>): string {
  const params = canonParams(r.params)
  const sorted = Object.fromEntries(Object.keys(params).sort().map((k) => [k, params[k]]))
  return JSON.stringify({
    v: 1,
    kind: r.kind,
    name: canonName(r.name),
    description: canonText(r.description),
    params: sorted,
  })
}

export const recipeHash = (r: Pick<Recipe, 'kind' | 'name' | 'description' | 'params'>) =>
  sha256Hex(canonical(r))

export const isRecipeKind = (v: unknown): v is RecipeKind =>
  (RECIPE_KINDS as readonly string[]).includes(v as string)

/** Zkontroluje a očistí obsah předpisu; bez druhu nebo názvu vrací `undefined`. Otisk a čas se nepřebírají. */
export function cleanRecipe(raw: unknown): RecipeInput | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const r = raw as Record<string, unknown>
  const name = canonName(r.name)
  if (!isRecipeKind(r.kind) || !name) return undefined
  return { kind: r.kind, name, description: canonText(r.description), params: canonParams(r.params) }
}

/** Dokončený předpis: očištěný obsah, otisk a čas úpravy. */
export async function sealRecipe(
  id: string,
  input: RecipeInput,
  updatedAt = new Date().toISOString(),
): Promise<Recipe> {
  const c = cleanRecipe(input)
  if (!c) throw new Error('Předpis potřebuje druh a název.')
  const full = { ...c, description: c.description ?? '', params: c.params ?? {} }
  return { id, ...full, contentHash: await recipeHash(full), updatedAt }
}

/** Odkaz postavy na předpis; stav jen jako čísla a krátké texty. Neplatný vstup vrací `undefined`. */
export function linkFrom(v: unknown): RecipeLink | undefined {
  if (typeof v !== 'object' || v === null) return undefined
  const r = v as Record<string, unknown>
  if (typeof r.recipeId !== 'string' || r.recipeId.length === 0 || r.recipeId.length > 100) return undefined
  const state: RecipeLink['state'] = {}
  if (typeof r.state === 'object' && r.state !== null && !Array.isArray(r.state))
    for (const [k, x] of Object.entries(r.state)) {
      if (Object.keys(state).length >= MAX_STATE) break
      if (k.length === 0 || k.length > MAX_PARAM_KEY || k.includes('.')) continue
      if (typeof x === 'number' && Number.isFinite(x)) state[k] = x
      else if (typeof x === 'string') state[k] = x.slice(0, MAX_PARAM_VALUE)
    }
  return { recipeId: r.recipeId, state }
}

/** Mapa odkazů podle ID odkazu; neplatné položky se vynechají. */
export function linksFrom(raw: unknown): Record<string, RecipeLink> {
  const out: Record<string, RecipeLink> = {}
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return out
  for (const [id, v] of Object.entries(raw).slice(0, MAX_LINKS)) {
    const l = linkFrom(v)
    if (l && id.length > 0 && id.length <= 100 && !id.includes('.')) out[id] = l
  }
  return out
}
