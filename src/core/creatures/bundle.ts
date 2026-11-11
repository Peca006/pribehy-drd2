// Výměna bytostí mezi vypravěči: balíček `{ format, type: 'bestiar', creatures }` v JSONu.
// Import bere data z neznámého zdroje, proto se každá bytost „očistí“ – ponechají se jen známá pole
// očekávaných typů a omezené délky (texty jsou mini-markdown, nikdy HTML).
import type { Attribute, Creature, CreatureSection, CreatureStat } from '../content/schema'

export const BUNDLE_FORMAT = 1
export const MAX_CREATURES = 500
const MAX_TEXT = 20000
const ATTRS: Attribute[] = ['Tělo', 'Duše', 'Vliv']

export interface CreatureBundle {
  format: typeof BUNDLE_FORMAT
  type: 'bestiar'
  name?: string
  creatures: Creature[]
}

export const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** Nové unikátní ID vlastní bytosti. */
export function newCreatureId(name: string, existing: Iterable<string>): string {
  const taken = new Set(existing)
  const base = `vlastni:${slugify(name) || 'bytost'}`
  let id = base
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`
  return id
}

export const blankCreature = (): Creature => ({
  id: '',
  name: '',
  kind: 'vlastni',
  stats: [],
  description: '',
  sections: [],
  source: 'user',
})

/** Export bez příznaku `source` – ten si příjemce nastaví při importu sám. */
export function exportBundle(creatures: Creature[], name?: string): string {
  const bundle: CreatureBundle = {
    format: BUNDLE_FORMAT,
    type: 'bestiar',
    ...(name ? { name } : {}),
    creatures: creatures.map((c) => {
      const copy = { ...c }
      delete copy.source
      return copy
    }),
  }
  return JSON.stringify(bundle, null, 1)
}

const str = (v: unknown, max = MAX_TEXT): string | undefined =>
  typeof v === 'string' ? v.slice(0, max) : undefined
const num = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1000 ? v : undefined

/** Očistí jednu bytost z neznámého zdroje; `undefined`, pokud nemá použitelný název. */
export function sanitizeCreature(raw: unknown): Creature | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const r = raw as Record<string, unknown>
  const name = str(r.name, 200)?.trim()
  if (!name) return undefined
  const c: Creature = {
    id: str(r.id, 200) ?? '',
    name,
    kind: str(r.kind, 60)?.trim() || 'vlastni',
    stats: [],
    description: str(r.description) ?? '',
    sections: [],
  }
  const glyphs = str(r.glyphs, 20)
  if (glyphs) c.glyphs = glyphs
  const variantOf = str(r.variantOf, 200)
  if (variantOf) c.variantOf = variantOf
  const fate = num(r.fate)
  if (fate !== undefined) c.fate = fate
  const ch = r.characteristic as Record<string, unknown> | undefined
  if (ch && num(ch.min) !== undefined && num(ch.max) !== undefined) {
    c.characteristic = { min: num(ch.min)!, max: num(ch.max)! }
    const note = str(ch.note, 1000)
    if (note) c.characteristic.note = note
  }
  if (typeof r.limits === 'object' && r.limits !== null) {
    const limits: Partial<Record<Attribute, number>> = {}
    for (const a of ATTRS) {
      const v = num((r.limits as Record<string, unknown>)[a])
      if (v !== undefined) limits[a] = v
    }
    if (Object.keys(limits).length) c.limits = limits
  }
  if (Array.isArray(r.stats))
    for (const s of r.stats.slice(0, 50)) {
      const label = str((s as CreatureStat)?.label, 100)?.trim()
      const value = str((s as CreatureStat)?.value, 5000)
      if (label && value !== undefined) c.stats.push({ label, value })
    }
  if (Array.isArray(r.sections))
    for (const s of r.sections.slice(0, 30)) {
      const title = str((s as CreatureSection)?.title, 200)?.trim()
      const text = str((s as CreatureSection)?.text)
      if (title && text !== undefined)
        c.sections.push({ id: str((s as CreatureSection).id, 100) || slugify(title), title, text })
    }
  const copiedFrom = str(r.copiedFrom, 200)
  if (copiedFrom) c.copiedFrom = copiedFrom
  return c
}

/** Přijme balíček, holé pole bytostí i jedinou bytost. */
export function parseBundle(json: string): { creatures: Creature[]; errors: string[] } {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return { creatures: [], errors: ['Text není platný JSON.'] }
  }
  const obj = data as { type?: unknown; format?: unknown; creatures?: unknown }
  let list: unknown[]
  if (Array.isArray(data)) list = data
  else if (obj && typeof obj === 'object' && Array.isArray(obj.creatures)) {
    if (obj.type !== undefined && obj.type !== 'bestiar')
      return { creatures: [], errors: ['Toto není balíček bestiáře.'] }
    if (obj.format !== undefined && obj.format !== BUNDLE_FORMAT)
      return { creatures: [], errors: [`Nepodporovaný formát: ${String(obj.format)}`] }
    list = obj.creatures
  } else list = [data]

  const errors: string[] = []
  if (list.length > MAX_CREATURES) errors.push(`Příliš mnoho bytostí (nejvýš ${MAX_CREATURES}).`)
  const creatures: Creature[] = []
  list.slice(0, MAX_CREATURES).forEach((raw, i) => {
    const c = sanitizeCreature(raw)
    if (c) creatures.push(c)
    else errors.push(`Položka ${i + 1} nemá název a byla přeskočena.`)
  })
  if (!creatures.length && !errors.length) errors.push('Žádné bytosti k importu.')
  return { creatures, errors }
}
