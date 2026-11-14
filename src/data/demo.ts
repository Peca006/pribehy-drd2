// Ukázková data: tři postavy a družina. Vymyšlené postavy z vestavěného přehledu (jen ID ras, povolání a schopností,
// žádné texty pravidel). Slouží k vyzkoušení aplikace a k testům; jdou smazat a ve Více se dají obnovit.
import { emptyCharacter, eventsFor, type Character, type CharacterLog } from '../core/character/model'
import { emptyParty, type Party } from '../core/party/model'

export const DEMO_PARTY_ID = 'demo-druzina'

const base = (id: string, c: Partial<Character>): Character => ({ ...emptyCharacter(id), ...c })

export const DEMO_CHARACTERS: Character[] = [
  base('demo-brokan', {
    name: 'Brokan Rudovous',
    concept: 'Trpasličí strážce horských stezek',
    raceId: 'rasa:trpaslici',
    cultureId: 'kultura:trpaslici/horsti-trpaslici',
    attributes: { Tělo: 8, Duše: 3, Vliv: 4 },
    professions: { 'povolani:bojovnik': 3 },
    abilities: [
      'schopnost:trpaslici/nezdolnost',
      'schopnost:bojovnik/cit-pro-zbran',
      'schopnost:bojovnik/sampion',
      'schopnost:bojovnik/gladiator',
    ],
    trait: 'rys:kodex',
    heroStory:
      'Roky doprovázel karavany přes horské průsmyky a přísahal, že nikoho z nich nenechá napospas lavinám ani lupičům.',
    equipment: ['zbroj', 'dvě zbraně', 'torna', 'křesadlo', 'lano', 'lucerna', 'pokrývka', 'jídlo na týden'],
    cash: 300,
  }),
  base('demo-listek', {
    name: 'Lístek Podhorní',
    concept: 'Hobití kejklíř a občasný lovec',
    raceId: 'rasa:hobiti',
    cultureId: 'kultura:hobiti/potulni-hobiti',
    attributes: { Tělo: 5, Duše: 4, Vliv: 6 },
    professions: { 'povolani:kejklir': 2, 'povolani:lovec': 1 },
    abilities: [
      'schopnost:hobiti/tichoslapek',
      'schopnost:kejklir/desiva-presnost',
      'schopnost:kejklir/akrobat',
      'schopnost:lovec/dobra-muska',
    ],
    trait: 'rys:rebel',
    heroStory:
      'Vyrostl na pouti za pouťovými stánky, kde se naučil žonglovat, odhadovat lidi a včas zmizet, když se věci zvrtly.',
    equipment: ['zbraň', 'oblečení', 'torna', 'křesadlo', 'měch na vodu', 'jídlo na tři dny'],
    cash: 120,
  }),
  base('demo-eliska', {
    name: 'Eliška z Mlžných hájů',
    concept: 'Osadnická zářikavka s darem pro tvoření',
    raceId: 'rasa:lide',
    cultureId: 'kultura:lide/osadnici',
    attributes: { Tělo: 3, Duše: 7, Vliv: 5 },
    professions: { 'povolani:zarikavac': 2, 'povolani:mastickar': 1 },
    abilities: [
      'schopnost:lide/zarputilost',
      'schopnost:zarikavac/divoky-talent',
      'schopnost:zarikavac/povolavac',
      'schopnost:mastickar/vyjednavac',
    ],
    trait: 'rys:primost',
    heroStory:
      'Do světa ji vyhnala zvědavost: chtěla zjistit, odkud se v osadě bere mlha, o které nikdo nechce mluvit.',
    equipment: ['zbraň', 'oblečení', 'torna', 'křesadlo', 'měch na vodu', 'jídlo na tři dny'],
    cash: 120,
  }),
]

export const demoParty = (): Party => ({
  ...emptyParty('Ukázková družina'),
  id: DEMO_PARTY_ID,
  notes: 'Ukázková data k vyzkoušení aplikace. Můžete je upravit nebo smazat, ve Více je lze obnovit.',
  members: DEMO_CHARACTERS.map((c) => ({ id: `demo-clen-${c.id}`, name: c.name, characterId: c.id })),
})

/** Deník postavy z hotových hodnot (jedna revize „Ukázková data“). */
export const demoLog = (c: Character, author: string): CharacterLog => ({
  id: c.id,
  events: eventsFor(emptyCharacter(c.id), c, author, 'Ukázková data'),
})
