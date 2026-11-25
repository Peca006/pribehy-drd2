// Instalace ukázkových dat: při prvním spuštění do prázdné aplikace a na požádání v Dílně (obnoví jen ukázková data).
import { DEMO_CHARACTERS, demoLog, demoParty } from '../data/demo'
import { DEMO_RECIPES } from '../data/demoRecipes'
import { demoAdventure, demoExpeditions } from '../data/demoExpeditions'
import { deleteLog, listLogs, saveLog } from './character/store'
import {
  deleteAdventure,
  deleteExpedition,
  deleteRun,
  listAdventures,
  listExpeditions,
  listRuns,
  saveAdventure,
  saveExpedition,
} from './expedition/store'
import { deleteParty, listParties, saveParty } from './party/store'
import { sealRecipe } from './recipes/model'
import { listRecipes, putRecipe, removeRecipe } from './recipes/store'

const FLAG = 'drd2-demo-seeded'
/** Všechna ukázková data mají ID s touto předponou, takže jdou odstranit najednou (i ta, která přibudou). */
export const DEMO_PREFIX = 'demo-'

/** Odstraní všechna ukázková data (postavy, družiny, jejich rozpracovaný konflikt, ukázkové předpisy v Grimoáru a ukázkové výpravy i s jejich vedením). Ostatní data se nedotkne. */
export async function removeDemo() {
  for (const r of await listRuns())
    if ([r.id, r.partyId, r.expeditionId].some((x) => x.startsWith(DEMO_PREFIX))) await deleteRun(r.id)
  for (const e of await listExpeditions()) if (e.id.startsWith(DEMO_PREFIX)) await deleteExpedition(e.id)
  for (const a of await listAdventures()) if (a.id.startsWith(DEMO_PREFIX)) await deleteAdventure(a.id)
  for (const r of await listRecipes()) if (r.id.startsWith(DEMO_PREFIX)) await removeRecipe(r.id)
  for (const l of await listLogs()) if (l.id.startsWith(DEMO_PREFIX)) await deleteLog(l.id)
  for (const p of await listParties())
    if (p.id.startsWith(DEMO_PREFIX)) {
      await deleteParty(p.id)
      try {
        localStorage.removeItem(`drd2-conflict:${p.id}`)
      } catch {
        /* nic dalšího k uklizení */
      }
    }
  try {
    localStorage.setItem(FLAG, '1')
  } catch {
    /* bez úložiště se jen může nabídnout znovu */
  }
}

/** Přepíše (obnoví) ukázkové postavy, družinu, předpisy v Grimoáru a ukázkové dobrodružství s výpravami; ostatní data se nedotkne. */
export async function restoreDemo(author: string) {
  for (const r of DEMO_RECIPES) await putRecipe(await sealRecipe(r.id, r))
  for (const c of DEMO_CHARACTERS) await saveLog(demoLog(c, author))
  await saveParty(demoParty())
  for (const e of demoExpeditions()) await saveExpedition(e)
  await saveAdventure(demoAdventure())
  try {
    localStorage.setItem(FLAG, '1')
  } catch {
    /* bez úložiště se jen může nabídnout znovu */
  }
}

/** Při úplně prvním použití (žádné postavy ani družiny, dosud nenabídnuto) nainstaluje ukázková data. Vrací, zda se tak stalo. */
export async function seedDemoOnce(author: string): Promise<boolean> {
  try {
    if (localStorage.getItem(FLAG)) return false
    if ((await listLogs()).length || (await listParties()).length) {
      localStorage.setItem(FLAG, '1')
      return false
    }
  } catch {
    return false
  }
  await restoreDemo(author)
  return true
}
