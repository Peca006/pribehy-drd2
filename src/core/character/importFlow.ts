// Průběh importu revizí (logika panelu Import): popisy druhu importu, změny po jednotlivých příchozích revizích,
// přijetí vybraných revizí (včetně zařazení předpisů do Grimoáru) a vrácení zamítnutých změn u hráče.
import { importRecipes, remapBundle, type RecipeImport } from '../recipes/exchange'
import { importSharedImages } from './imageFile'
import { characterOf, type Character, type CharacterLog } from './model'
import { groupRevisions, revertEvents, revisionChanges } from './revisions'
import { applyRevisions, type ImportAnalysis, type RevisionBundle } from './share'
import { appendEvents, getLog, saveLog } from './store'

export const KIND_TEXT: Record<ImportAnalysis['kind'], string> = {
  'nova-postava': 'Tuto postavu ještě v zařízení nemáte, vznikne nová.',
  navazuje: 'Změny navazují na poslední revizi v deníku.',
  'jiny-stav':
    'V deníku jsou od společného základu novější změny. Příchozí hodnoty přepíšou současné u stejných polí.',
  'neznamy-zaklad':
    'Základ těchto změn v deníku není (postava mohla být upravena jinde). Zkontrolujte rozdíl.',
  'nic-noveho': 'Všechny revize už v deníku jsou.',
}

/** Zpráva o zařazení předpisů do Grimoáru; `what` je podstata zprávy před seznamem konfliktů. */
export function recipeImportNote(imp: RecipeImport): string {
  const base = `přidáno ${imp.added.length}, použito stávajících ${imp.reused}.`
  const conflict = imp.conflicts.length
    ? ` Pozor, předpisy se stejným označením a jiným obsahem se uložily zvlášť: ${imp.conflicts.join(', ')}.`
    : ''
  return base + conflict
}

export interface IncomingStep {
  r: ImportAnalysis['fresh'][number]
  changes: ReturnType<typeof revisionChanges>
  before: Character | undefined
  after: Character
}

/** Změny jednotlivých příchozích revizí v pořadí, v jakém se použijí (stav před a po každé z nich). */
export function incomingSteps(
  log: CharacterLog | undefined,
  bundle: RevisionBundle,
  analysis: ImportAnalysis,
): IncomingStep[] {
  let tmp: CharacterLog | undefined = log
  return analysis.fresh.map((r) => {
    const before = tmp ? characterOf(tmp) : undefined
    tmp = applyRevisions(tmp, bundle, new Set([r.id]))
    const rev = groupRevisions(tmp.events).find((x) => x.id === r.id)
    return { r, changes: rev ? revisionChanges(tmp, rev) : [], before, after: characterOf(tmp) }
  })
}

/** Rozdělení příchozích revizí podle zaškrtnutí. */
export function decisionOf(analysis: ImportAnalysis, accept: Record<string, boolean>) {
  return {
    accepted: analysis.fresh.filter((r) => accept[r.id]).map((r) => r.id),
    rejected: analysis.fresh.filter((r) => !accept[r.id]).map((r) => r.id),
  }
}

/**
 * Přijme vybrané revize do deníku. Přiložené předpisy se zařadí do Grimoáru a odkazy v revizích se opraví na
 * předpisy příjemce. Vrací zprávu o předpisech (prázdnou, když žádné nebyly).
 */
export async function acceptRevisions(
  log: CharacterLog | undefined,
  bundle: RevisionBundle,
  accepted: readonly string[],
): Promise<string> {
  if (!accepted.length) return ''
  let note = ''
  let b = bundle
  if (b.recipes?.length) {
    const imp = await importRecipes(b.recipes)
    b = remapBundle(b, imp.map)
    note = ` Předpisy v Grimoáru: ${recipeImportNote(imp)}`
  }
  await saveLog(applyRevisions(log, b, new Set(accepted)))
  if (b.images?.length) {
    const img = await importSharedImages(b.char, b.images)
    note += ` Ilustrace: přidáno ${img.added}${img.skipped ? `, už byly ${img.skipped}` : ''}.`
  }
  return note
}

/** Vrátí změny zamítnutých revizí (od nejnovější po nejstarší, aby se vracelo postupně). */
export async function revertRejectedRevisions(
  log: CharacterLog,
  rejected: readonly string[],
  author: string,
): Promise<CharacterLog> {
  let cur = log
  for (const rid of [...rejected].reverse()) {
    const rev = groupRevisions(cur.events).find((r) => r.id === rid)
    if (!rev) continue
    const undo = revertEvents(cur, rev, author, `Vrácení (zamítnuto): ${rev.note || 'změna'}`)
    if (undo.length) cur = await appendEvents(cur.id, undo)
  }
  return (await getLog(cur.id)) ?? cur
}
