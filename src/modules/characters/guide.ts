import { srdChapterUrl } from '../../core/srd'
// Stručný postup vyhodnocení (vlastní heslovitý výtah, ne text pravidel). Podrobnosti jsou v příručce.
export interface Card {
  id: string
  title: string
  steps: string[]
  /** kotva v kapitole příručky `32-slozitejsi-situace` nebo celé ID kapitoly `kapitola#kotva` */
  link?: string
  /** dovednosti související s kartou (ID bez `dovednost:`); názvy se berou z balíčku, bez něj se odkáže do SRD */
  skills?: string[]
}

export const BASIC: Card[] = [
  {
    id: 'zkouska',
    title: 'Zkouška',
    steps: [
      'Hráč ohlásí akci, záměr a hrozící neúspěch.',
      'Nejdřív manévry před hodem (přesně: 3 kostky, dvě nejvyšší).',
      'Hod 2k6 + úroveň povolání. 9 a více je úspěch.',
      'Neúspěch: vyčerpat se (Zdroje = Ohrožení, nejméně 1, Ohrožení +1), nebo přijmout.',
      'Po úspěchu následky: Ohrožení cíle, Jizva, Výhoda (mocně, lstivě).',
    ],
    link: '31-zakladni-pravidla',
  },
  {
    id: 'stret',
    title: 'Střet',
    steps: [
      'Aktér ohlásí akci, soupeř protiakci (z iniciativy, nebo z obrany s manévrem obrana).',
      'Oba hodí 2k6 + úroveň (případně přesně).',
      'Vyšší hod vítězí. Shoda: aktér, pak vyšší kostka, vyšší součet, los.',
      'Poražený se vyčerpá (zmírní následek), nebo přijme neúspěch.',
      'Po přijetí neúspěchu manévr lstivě; mocně zdraží vyčerpání.',
    ],
    link: '31-zakladni-pravidla',
  },
  {
    id: 'vyzva',
    title: 'Výzva',
    steps: [
      'Akce prostředí, následná akce nebo nástraha míří na postavu.',
      'Postava ohlásí protiakci, nebo nereaguje (následek nastane hned).',
      'Hod 2k6 + úroveň. 9 a více odvrátí následek.',
      'Neúspěch lze jen zmírnit vyčerpáním, nebo přijmout. Úspěch nesnižuje Ohrožení.',
    ],
    link: '31-zakladni-pravidla',
  },
  {
    id: 'kolo',
    title: 'Kolo konfliktu',
    steps: [
      'Iniciativa: z příběhu, jinak hod bez dovednosti (rychle/pomalu za 1 Duši, bytost 1 Sudbu).',
      'Od nejvyšší iniciativy se hlásí akce. Každý má jednu akci z iniciativy.',
      'Kdo ještě nejednal, může protiakcí zabránit cizí akci. Tím akci z iniciativy spotřebuje.',
      'Kdo už jednal, může jen z obrany, když mu akce škodí a použije manévr obrana.',
      'Iniciativu lze odložit: pak už jen reaguje. Nezareaguje-li nikdo, přijde o akci.',
      'Na konci kola akce prostředí (výzvy). Nové kolo, nebo konec, když jedna strana nemůže hrát.',
    ],
    link: '31-zakladni-pravidla',
  },
  {
    id: 'leceni',
    title: 'Léčení Jizvy',
    steps: [
      'Jen v magickém okamžiku; jeho síla musí být aspoň závažnost léčené Jizvy.',
      'Jeden ošetřující, jedna Jizva, jeden ošetřovaný. Ošetřující dělá zkoušku (hodem, nebo vyčerpáním).',
      'Ošetřovaný platí 5 Zdrojů za snížení o 1: nejdřív Zdroje vlastnosti Jizvy, zbytek z ostatních.',
      'Lektvar nebo mast ušetří Zdroje (1 Surovina = 1 Zdroj). Výhodou ani další Jizvou platit nejde.',
      'Léčit se lze i samotnému, ale při neúspěchu platí vyčerpání i Zdroje.',
    ],
    link: '36-kouzla-nastrahy-leceni',
    skills: ['mastickar/masti-a-bezne-jedy', 'alchymista/vyroba-elixiru', 'alchymista/pouzivani-elixiru'],
  },
  {
    id: 'vyroba',
    title: 'Výroba a opravy',
    steps: [
      'Vhodné podmínky (místo, čas, pomůcky) posuzuje Průvodce. Bez Surovin jen nouzový předmět.',
      'Cena v Surovinách: nástroj nebo ochranný předmět zhruba polovina ceny, spotřební předmět pevně daná, oprava 5 za stupeň závažnosti.',
      'Mezi výpravami se spotřebují jen Suroviny. Na výpravě zkouška: neúspěch obvykle propálí Suroviny, přerušení je střet.',
      'Výrobou nelze zasadit Jizvu. Kvalitní předměty jen s bravurní dovedností.',
    ],
    link: '35-pouzivani-dovednosti',
    skills: ['alchymista/vyroba-elixiru', 'mastickar/masti-a-bezne-jedy', 'saman/vyroba-omamnych-latek-a-odvaru', 'alchymista/vyroba-traskavin-ziravin-a-plynnych-jedu', 'lupic/vyroba-kontaktnich-jedu'],
  },
  {
    id: 'kouzla',
    title: 'Kouzla',
    steps: [
      'Bez rituálu (zvuky a slova, gesta, příprava substance) kouzlo nejde seslat.',
      'Dosah (dotyk, dohled, symbolický dotyk, obrazec), rozsah (chýše, statek) a trvání (okamžitě, dlouho, velmi dlouho) vychází z podoby kouzla v příběhu.',
      'Cena: základní kouzlo nestojí nic, náročné 1 Zdroj, aktivace schopnosti se platí, substance Surovinami podle magie.',
      'Zkouška nebo střet jako u jiné akce. Zmařené kouzlo propadne vložené Zdroje.',
      'Obrana soupeře: přerušení rituálu, únik z dosahu, zrušení účinků, vyčkání, protikouzlo.',
    ],
    link: '36-kouzla-nastrahy-leceni',
  },  {
    id: 'nastrahy',
    title: 'Nástrahy',
    steps: [
      'Cena v Surovinách: základ 3, +1 vyřazení (zabít), +1 vložený manévr, +1 pokročilý druh, +1 za každou další vlastnost.',
      'Spuštěná nástraha míří na cílovou vlastnost a vyhodnocuje se jako výzva (hodí cíl; vyčerpání jen zmírní).',
      'Ukrytá nástraha: bez šance si všimnout se spustí hned, při šanci je odhalení výzva, při cíleném hledání zkouška.',
      'Přímo ovládaná nástraha je nástroj vlastní akce (hodí ovládající s dovedností, kterou nástrahu vyrobil), jed se do protiakce hodí zřídka.',
    ],
    link: '36-kouzla-nastrahy-leceni',
    skills: ['alchymista/vyroba-traskavin-ziravin-a-plynnych-jedu', 'alchymista/pouzivani-traskavin-ziravin-a-plynnych-jedu', 'lupic/vyroba-kontaktnich-jedu', 'lupic/pouziti-kontaktnich-jedu'],
  },
]

export const SITUATIONS: Card[] = [
  {
    id: 'vice-postav',
    title: 'Zkouška více postav',
    steps: [
      'Podle příběhu stačí jeden úspěch, musí uspět všichni, nebo se hodnotí každý zvlášť.',
      'Společná činnost: stačí úspěch jedné z postav.',
    ],
    link: 'zkouska-vice-postav',
  },
  {
    id: 'vice-cilu',
    title: 'Akce na více cílů',
    steps: [
      'Zkouška: při neúspěchu stačí jedno vyčerpání ve výši Ohrožení, Ohrožení +1.',
      'Střet: vyčerpání se platí proti každé akci a každému chráněnému cíli zvlášť.',
      'Cíl, který nereagoval, zasáhne akce při hodu aktéra 9+ nebo jeho vyčerpání.',
    ],
    link: 'zkouska-pusobici-na-vice-cilu',
  },
  {
    id: 'pripravne',
    title: 'Přípravné akce',
    steps: [
      'Samozřejmé jen ohlásit, ostatní jako zkouška nebo střet.',
      'Úspěch mění okolnosti, často jde o první kolo konfliktu (Ohrožení, Výhoda).',
      'Lze i uprostřed konfliktu, třeba odebrat protivníkovi možnost úniku.',
    ],
    link: 'pripravne-akce',
  },
  {
    id: 'spoluprace',
    title: 'Spolupráce',
    steps: [
      'Společná činnost: zkouška najednou, stačí úspěch jedné z postav.',
      'V konfliktu spolupráce hlavně přes iniciativu a přípravné akce.',
    ],
    link: 'spoluprace',
  },
  {
    id: 'ukryvani',
    title: 'Ukrývání a odhalování',
    steps: [
      'Klamaný nehledá a nemá šanci všimnout si: ukrytý uspěje, odhalení nehrozí.',
      'Nehledá, ale může si všimnout náhodou: výzva (případně náročnost).',
      'Hledá aktivně: zkouška. Ukrytý se brání: střet, iniciativu mívá ukrytý.',
      'Úspěch ukrytého: klamaný ztrácí podezření. Úspěch klamaného: ukrytý odhalen.',
    ],
    link: 'ukryvani-a-odhalovani',
  },
  {
    id: 'nasledna',
    title: 'Následná akce a akce prostředí',
    steps: [
      'Obě se vyhodnocují jako výzvy: akce prostředí na konci kola, následná hned po spouštěcí akci.',
      'Zasažený může zareagovat akcí z obrany, když je ohrožen bezprostředně.',
    ],
    link: 'nasledna-akce-a-akce-prostredi',
  },
  {
    id: 'hrstka',
    title: 'Hrstka a houf, delší akce',
    steps: [
      'Hrstka je do asi 12, houf do asi 60 (sevřená nebo rozptýlená).',
      'Delší akce: jeden hod. Přeruší-li ji někdo, je to střet o pokračování.',
    ],
    link: 'hrstka-a-houf',
  },
]

/** Cíl odkazu do příručky. */
export const linkOf = (c: Card) =>
  c.link?.includes('-') && /^\d\d-/.test(c.link)
    ? `#/ctenar/${c.link}`
    : c.link
      ? `#/ctenar/32-slozitejsi-situace/${c.link}`
      : undefined

/** ID kapitoly příručky, na kterou karta odkazuje. */
export const chapterOf = (c: Card): string | undefined =>
  /^#\/ctenar\/([^/]+)/.exec(linkOf(c) ?? '')?.[1]

/** Odkaz na stejné místo v SRD (použije se, když není nainstalován balíček s příručkou). */
export const srdOf = (c: Card) => {
  const l = linkOf(c)
  if (!l) return undefined
  const [, chapter, anchor] = /^#\/ctenar\/([^/]+)(?:\/(.+))?$/.exec(l) ?? []
  return chapter ? srdChapterUrl(chapter, anchor) : undefined
}

export interface SkillRef {
  id: string
  name: string
  attribute?: string
  profession: string
}

/** Názvy dovedností karty z nainstalovaného balíčku (pořadí podle karty); nenalezené se vynechají. */
export function skillsOf(
  c: Card,
  professions: { name: string; skills: { id: string; name: string; attribute?: string; attributeNote?: string }[] }[],
): SkillRef[] {
  const out: SkillRef[] = []
  for (const sid of c.skills ?? []) {
    for (const p of professions) {
      const sk = p.skills.find((x) => x.id === `dovednost:${sid}`)
      if (sk) out.push({ id: sk.id, name: sk.name, attribute: sk.attribute ?? sk.attributeNote, profession: p.name })
    }
  }
  return out
}
