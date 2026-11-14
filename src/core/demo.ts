// Instalace ukázkových dat: při prvním spuštění do prázdné aplikace a na požádání ve Více (obnoví jen ukázková data).
import { DEMO_CHARACTERS, demoLog, demoParty } from '../data/demo'
import { listLogs, saveLog } from './character/store'
import { listParties, saveParty } from './party/store'

const FLAG = 'drd2-demo-seeded'

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
