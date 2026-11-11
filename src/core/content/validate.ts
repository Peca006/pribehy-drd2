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
  return errors
}
