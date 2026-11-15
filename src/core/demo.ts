// Instalace ukázkových dat: při prvním spuštění do prázdné aplikace a na požádání ve Více (obnoví jen ukázková data).
import { DEMO_CHARACTERS, demoLog, demoParty } from '../data/demo'
import { deleteLog, listLogs, saveLog } from './character/store'
import { deleteParty, listParties, saveParty } from './party/store'

const FLAG = 'drd2-demo-seeded'
/** Všechna ukázková data mají ID s touto předponou, takže jdou odstranit najednou (i ta, která přibudou). */
export const DEMO_PREFIX = 'demo-'

/** Odstraní všechna ukázková data (postavy, družiny a jejich rozpracovaný konflikt). Ostatní data se nedotkne. */
export async function removeDemo() {
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

/** Přepíše (obnoví) ukázkové postavy a družinu; ostatní data se nedotkne. */
export async function restoreDemo(author: string) {
  for (const c of DEMO_CHARACTERS) await saveLog(demoLog(c, author))
  await saveParty(demoParty())
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
