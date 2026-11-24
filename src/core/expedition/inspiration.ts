// Inspirace při přípravě výpravy (SRD, část Průběžná příprava): příběh a cíle postav družiny jsou první zdroj námětů.
import { characterOf, type CharacterLog } from '../character/model'
import type { Party } from '../party/model'

export interface Hint {
  memberName: string
  name: string
  concept: string
  trait: string
  heroStory: string
  /** popisy Jizev (slabá místa postavy) */
  scars: string[]
}

/** Podněty z postav členů družiny, které jsou v tomto zařízení (člen bez postavy nebo s prázdnou postavou se vynechá). */
export function hintsOf(party: Pick<Party, 'members'>, logs: ReadonlyMap<string, CharacterLog>): Hint[] {
  const out: Hint[] = []
  for (const m of party.members) {
    const log = m.characterId ? logs.get(m.characterId) : undefined
    if (!log) continue
    const c = characterOf(log)
    const hint: Hint = {
      memberName: m.name,
      name: c.name.trim() || m.name,
      concept: c.concept.trim(),
      trait: c.trait.trim(),
      heroStory: c.heroStory.trim(),
      scars: c.scars.map((s) => s.note.trim()).filter(Boolean),
    }
    if (hint.concept || hint.trait || hint.heroStory || hint.scars.length) out.push(hint)
  }
  return out
}

/** Otázky z pravidel pro rozhovor s hráči mezi sezeními. */
export const QUESTIONS = [
  'Čeho chce vaše postava dosáhnout a co jí v tom brání?',
  'Co byste chtěli skrze své postavy prožít?',
  'Které z odehraných zápletek se příště chcete chytit?',
  'Koho z cizích postav podezíráte a co čekáte, že objevíte?',
]
