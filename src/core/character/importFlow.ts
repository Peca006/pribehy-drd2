// Průběh importu revizí (logika panelu Import): popisy druhu importu, změny po jednotlivých příchozích revizích,
// přijetí vybraných revizí (včetně zařazení předpisů do Grimoáru) a vrácení zamítnutých změn u hráče.
import { importRecipes, remapBundle, type RecipeImport } from '../recipes/exchange'
import { importSharedImages } from './imageFile'
import { characterOf, type Character, type CharacterLog, type ChangeEvent } from './model'
import { getAt, groupRevisions, revertEvents, revisionChanges } from './revisions'
import { applyRevisions, type ImportAnalysis, type RevisionBundle } from './share'
import { appendEvents, getLog, saveLog } from './store'

export const KIND_TEXT: Record<ImportAnalysis['kind'], string> = {
  'nova-postava': 'Tuto postavu ještě v zařízení nemáte, vznikne nová.',
  navazuje: 'Změny navazují na poslední revizi v deníku.',
  'jiny-stav':
    'V deníku jsou od společného základu novější změny. U polí změněných na obou stranách si zvolíte, která hodnota platí (výchozí je příchozí).',
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
 * U vybraných konfliktních polí ponechá místní hodnotu: po přijetí revizí se přidá revize „Ponecháno moje“, která
 * hodnotu vrátí. Příchozí události v deníku zůstanou (opakovaný import pak nic nového nenajde).
 * `before` je deník před přijetím, `after` deník po přijetí.
 */
export function withKeptMine(
  before: CharacterLog | undefined,
  after: CharacterLog,
  keepMine: readonly string[],
  by: string,
): CharacterLog {
  if (!before || !keepMine.length) return after
  const mineNow = characterOf(before)
  const ours = characterOf(after)
  const rid = `rev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  const at = new Date().toISOString()
  const events: ChangeEvent[] = keepMine
    .filter((path) => JSON.stringify(getAt(ours, path)) !== JSON.stringify(getAt(mineNow, path)))
    .map((path, i) => ({
      id: `${rid}-${i}`,
      at,
      by,
      note: 'Ponecháno moje (při importu)',
      rev: rid,
      path,
      value: getAt(mineNow, path),
    }))
  return events.length ? { ...after, events: [...after.events, ...events] } : after
}

/**
 * Přijme vybrané revize do deníku. Přiložené předpisy se zařadí do Grimoáru a odkazy v revizích se opraví na
 * předpisy příjemce. Vrací zprávu o předpisech (prázdnou, když žádné nebyly).
 */
export async function acceptRevisions(
  log: CharacterLog | undefined,
  bundle: RevisionBundle,
  accepted: readonly string[],
  keepMine: readonly string[] = [],
  by = '',
): Promise<string> {
  if (!accepted.length) return ''
  let note = ''
  let b = bundle
  if (b.recipes?.length) {
    const imp = await importRecipes(b.recipes)
    b = remapBundle(b, imp.map)
    note = ` Předpisy v Grimoáru: ${recipeImportNote(imp)}`
  }
  await saveLog(withKeptMine(log, applyRevisions(log, b, new Set(accepted)), keepMine, by))
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
