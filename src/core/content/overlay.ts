import type { Ability, ContentPack, Overlay, Skill } from './schema'

type Mutable = Record<string, unknown>

/** Aplikuje překryvy v daném pořadí na kopii balíčku. Neexistující cíl je chyba (hlásí se, ne ignoruje). */
export function applyOverlays(
  pack: ContentPack,
  overlays: Overlay[],
): { pack: ContentPack; errors: string[] } {
  const out: ContentPack = structuredClone(pack)
  const errors: string[] = []

  for (const ov of overlays) {
    if (!ov.appliesTo.includes(out.manifest.id)) {
      errors.push(`${ov.id}: nevztahuje se na balíček ${out.manifest.id}`)
      continue
    }
    for (const patch of ov.patches) {
      if (patch.op === 'add') {
        const prof = out.professions.find((p) => p.id === patch.parent)
        if (!prof) errors.push(`${ov.id}: neznámý rodič ${patch.parent}`)
        else (prof[patch.collection] as (Skill | Ability)[]).push(structuredClone(patch.item))
        continue
      }
      const found = locate(out, patch.target)
      if (!found) {
        errors.push(`${ov.id}: neznámý cíl ${patch.target}`)
        continue
      }
      if (patch.op === 'replace') Object.assign(found.item as Mutable, patch.fields)
      else found.list.splice(found.list.indexOf(found.item), 1)
    }
  }
  return { pack: out, errors }
}

function locate(pack: ContentPack, id: string): { list: unknown[]; item: unknown } | undefined {
  for (const list of [pack.professions as unknown[]]) {
    const item = (list as { id: string }[]).find((x) => x.id === id)
    if (item) return { list, item }
  }
  for (const p of pack.professions) {
    for (const list of [p.abilities as unknown[], p.skills as unknown[]]) {
      const item = (list as { id: string }[]).find((x) => x.id === id)
      if (item) return { list, item }
    }
  }
  return undefined
}
