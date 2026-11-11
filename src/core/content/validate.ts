import { PACK_FORMAT, type ContentPack } from './schema'

const ATTRS = ['Tělo', 'Duše', 'Vliv']

/** Vrací seznam chyb (prázdný = balíček je v pořádku). */
export function validatePack(pack: ContentPack): string[] {
  const errors: string[] = []
  const seen = new Set<string>()
  const unique = (id: string) => {
    if (seen.has(id)) errors.push(`duplicitní id: ${id}`)
    seen.add(id)
  }

  if (pack.manifest?.format !== PACK_FORMAT)
    errors.push(`nepodporovaný formát: ${pack.manifest?.format}`)
  for (const p of pack.professions ?? []) {
    unique(p.id)
    if (!p.name) errors.push(`${p.id}: chybí název`)
    if (!p.skills.length) errors.push(`${p.id}: žádné dovednosti`)
    if (!p.abilities.length) errors.push(`${p.id}: žádné zvláštní schopnosti`)
    for (const s of p.skills) {
      unique(s.id)
      if (s.attribute ? !ATTRS.includes(s.attribute) : !s.attributeNote)
        errors.push(`${s.id}: neplatná nebo chybějící vlastnost „${s.attribute}“`)
    }
    for (const a of p.abilities) {
      unique(a.id)
      if (a.attribute && !ATTRS.includes(a.attribute))
        errors.push(`${a.id}: neplatná vlastnost „${a.attribute}“`)
      if (!a.text) errors.push(`${a.id}: prázdný text`)
    }
  }
  for (const r of pack.races ?? []) {
    unique(r.id)
    if (!r.abilities.length) errors.push(`${r.id}: žádné rasové schopnosti`)
    const cultures = new Set(r.cultures.map((c) => c.name))
    for (const a of r.abilities) {
      unique(a.id)
      if (a.attribute && !ATTRS.includes(a.attribute))
        errors.push(`${a.id}: neplatná vlastnost „${a.attribute}“`)
      if (a.quickPickCulture && !cultures.has(a.quickPickCulture))
        errors.push(`${a.id}: rychlá volba odkazuje na neznámou kulturu „${a.quickPickCulture}“`)
    }
  }
  for (const g of pack.equipment ?? []) {
    unique(g.id)
    for (const i of g.items) unique(i.id)
  }
  for (const t of pack.traits ?? []) unique(t.id)
  for (const k of pack.startingKits ?? []) unique(k.id)
  for (const t of pack.terms ?? []) unique(t.id)
  return errors
}
