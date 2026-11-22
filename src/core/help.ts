import { srdChapterUrl } from './srd'
// Témata nápovědy (vlastní heslovitý výtah a návody k aplikaci, ne text pravidel). Podrobnosti jsou v příručce.
// Zobrazuje je `HelpPanel` (tlačítko „?“ u prvků) a panel Postup vyhodnocení.
export interface Card {
  id: string
  title: string
  /** `pravidlo` (výtah s odkazem do příručky) nebo `navod` (jak aplikaci používat); chybí-li, je to pravidlo */
  kind?: 'pravidlo' | 'navod'
  /** úvodní věta nebo dvě nad kroky */
  text?: string
  steps: string[]
  /** kotva v kapitole `32-slozitejsi-situace`, nebo `kapitola` či `kapitola#kotva` (`35-pouzivani-dovednosti#suroviny`) */
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
    link: '36-kouzla-nastrahy-leceni#leceni',
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
    link: '35-pouzivani-dovednosti#vyroba',
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
    link: '36-kouzla-nastrahy-leceni#ritualy-kouzel',
  },
  {
    id: 'nastrahy',
    title: 'Nástrahy',
    steps: [
      'Cena v Surovinách: základ 3, +1 vyřazení (zabít), +1 vložený manévr, +1 pokročilý druh, +1 za každou další vlastnost.',
      'Spuštěná nástraha míří na cílovou vlastnost a vyhodnocuje se jako výzva (hodí cíl; vyčerpání jen zmírní).',
      'Ukrytá nástraha: bez šance si všimnout se spustí hned, při šanci je odhalení výzva, při cíleném hledání zkouška.',
      'Přímo ovládaná nástraha je nástroj vlastní akce (hodí ovládající s dovedností, kterou nástrahu vyrobil), jed se do protiakce hodí zřídka.',
    ],
    link: '36-kouzla-nastrahy-leceni#nastrahy',
    skills: ['alchymista/vyroba-traskavin-ziravin-a-plynnych-jedu', 'alchymista/pouzivani-traskavin-ziravin-a-plynnych-jedu', 'lupic/vyroba-kontaktnich-jedu', 'lupic/pouziti-kontaktnich-jedu'],
  },
]

/** Témata k prvkům pomůcek: Hod, Zdroje, Suroviny, Hotovost, lektvary a Grimoár. */
export const TOPICS: Card[] = [
  {
    id: 'hod',
    title: 'Hod',
    text: 'Panel Hod vyhodnotí zkoušku, výzvu nebo střet; rozhodnutí zůstává na hráči a Průvodci.',
    steps: [
      'Hod 2k6 + úroveň povolání použité dovednosti (bez povolání 0). Úspěch je od 9.',
      'Kostky lze hodit v aplikaci, nebo zadat z fyzických.',
      'Ohrožení je počítadlo jen ve hře (není v deníku revizí). Vyčerpání po neúspěchu stojí Zdroje podle Ohrožení, nejméně 1.',
      'Manévry se platí 1 Zdrojem až při použití a nesčítají se.',
    ],
    link: '31-zakladni-pravidla#hod-kostkami',
  },
  {
    id: 'zdroje',
    title: 'Zdroje',
    text: 'Zdroje jsou Tělo, Duše a Vliv. Čerpají se při vyčerpání, platbách a manévrech.',
    steps: [
      'Zdroje vlastnosti odpovídají její hodnotě; Jizva část z nich zablokuje.',
      'Čerpání škrtá Zdroje, „Obnovit“ je vrátí. Stav čerpání je jen v zařízení, ne v deníku revizí.',
      'Zdroje ze sebezasazené Jizvy jsou dočasné a čerpají se jako první.',
      'Výhoda funguje jako „žolíkový“ Zdroj a platí se první.',
    ],
    link: '31-zakladni-pravidla#zdroje',
  },
  {
    id: 'suroviny',
    title: 'Suroviny',
    text: 'Druhá „měna“ vedle Peněz: vzácnější materiál pro výrobu, opravy a léčení.',
    steps: [
      'V deníku se vede celkový počet. Volitelně druhy (značka a název), u každé postavy zvlášť; druh s nenulovým počtem nejde smazat.',
      'Výroba, oprava nebo léčení škrtnou tolik Surovin, kolik stojí. Máš-li druhy, vybereš, z jakého se odečte.',
      'Mezi výpravami platí 1 Surovina = 1 groš.',
    ],
    link: '35-pouzivani-dovednosti#suroviny',
  },
  {
    id: 'hotovost',
    title: 'Hotovost',
    kind: 'navod',
    text: 'Dukáty, groše a haléře se evidují zvlášť. 1 groš = 10 haléřů, 1 dukát = 10 grošů.',
    steps: [
      'Nic se samo nepřevádí do vyššího řádu.',
      'Čerpání pod nulu rozmění minci z vyššího řádu (rozměnění dukátu se zeptá).',
      'Rychlá klepání na ± se zapíšou jako jedna revize.',
    ],
    link: '35-pouzivani-dovednosti#penize-a-nakupy-vybaveni',
  },
  {
    id: 'lektvary',
    title: 'Lektvary a masti',
    text: 'Lektvar, mast, odvar nebo nektar je zásobník Surovin pro jeden druh Jizvy.',
    steps: [
      'Každá vložená Surovina ušetří 1 Zdroj při léčení Jizvy stejné vlastnosti.',
      'Eviduje se vlastnost, druh Jizvy, počet Surovin a poznámka (např. platnost do slunovratu nebo rovnodennosti).',
      'Zásobník lze použít postupně na víc pacientů. Nouzové lektvary Zdroje neušetří a neevidují se.',
    ],
    link: '36-kouzla-nastrahy-leceni#lektvary',
  },
  {
    id: 'grimoar',
    title: 'Grimoár',
    kind: 'navod',
    text: 'Sklad předpisů (kouzla, lektvary, nástrahy, výrobky) na tomto zařízení; používání je nepovinné.',
    steps: [
      'Postavy se na předpis odkazují. Úprava se projeví u všech; „Uložit jako novou variantu“ vytvoří kopii.',
      'Při přenosu postavy jdou předpisy s ní. Stejný obsah se použije existující, jiný se vloží jako nový.',
      'Kouzlo lze seslat ad hoc bez ukládání. Mazání použitého předpisu vypíše postavy, které ho mají.',
    ],
  },
]

/** Témata k postavě, družině a sdílení. */
export const TOPICS_PARTY: Card[] = [
  {
    id: 'postup',
    title: 'Postup postavy',
    text: 'Za zkušenosti si postava zlepší povolání nebo zdatnost a získá zvláštní schopnost.',
    steps: [
      'Zlepšení stojí 12 bodů zkušeností: buď úroveň povolání a schopnost povolání, nebo zdatnost +1 a schopnost rasy či ovládaného povolání.',
      'Nejvyšší úroveň povolání je 5. Pokročilé povolání vyžaduje úrovně ve dvou základních povoláních (podmínky aplikace ukáže).',
      'Výsledek jde do návrhu úpravy s předvyplněným popisem; v editoru se zveřejní jako jedna revize.',
    ],
    link: '38-zkusenosti-a-zlepsovani-postavy',
  },
  {
    id: 'jizvy',
    title: 'Jizvy',
    text: 'Jizva postavu trvale poznamená: snižuje zdatnost a zablokuje část Zdrojů dané vlastnosti.',
    steps: [
      'Jizvu lze zasadit klepnutím na hodnotu nebo políčka Zdrojů (závažnost 1; víc způsobí manévr). Sebezasazená Jizva dá dočasné Zdroje.',
      '„Zmírnit“ otevře dialog léčení (5 Zdrojů za stupeň, lektvar ušetří Suroviny); „Zahojit“ Jizvu odstraní. Rozhoduje Průvodce mezi výpravami.',
      'Každá změna je revize v deníku postavy.',
    ],
    link: '31-zakladni-pravidla#jizvy',
  },
  {
    id: 'sezeni',
    title: 'Sezení a zkušenosti',
    kind: 'navod',
    text: 'Sezení rozdělí zkušenosti družině a zapíše shrnutí do žurnálu.',
    steps: [
      'Označ přítomné. Za účast dostane každý body podle rychlosti postupu družiny (3, 4 nebo 6).',
      'Odměny: nejvýš 2 body na hráče a odměnových bodů nejvýš o jeden víc než hráčů. Tajné odměny se hlasují, zapisují se jen součty.',
      'Členům s postavou v zařízení se body rovnou připíšou jako revize; ostatním se označí „předat hráči“.',
    ],
    link: '38-zkusenosti-a-zlepsovani-postavy',
  },
  {
    id: 'zurnal',
    title: 'Žurnál družiny',
    kind: 'navod',
    text: 'Žurnál dobrodružství vede Průvodce; hráči navrhují zápisy.',
    steps: [
      'Průvodce zápis přidá rovnou, hráč ho jen navrhne a Průvodce ho přijme, nebo zamítne.',
      'Hráč má kopii družiny; když Průvodce změní schválený zápis, zápis dostane značku „změnil Průvodce“ a tlačítko „Beru na vědomí“.',
      'Družinu posílá Průvodce od zvoleného zápisu nebo celou (Sdílet).',
    ],
  },
  {
    id: 'sdileni-postavy',
    title: 'Sdílení postavy',
    kind: 'navod',
    text: 'Postavu posíláš jako kód, soubor, QR nebo zvukem; nic nejde přes server.',
    steps: [
      'Posílají se změny od posledního odeslání, od zvolené revize, nebo celá postava.',
      'Do QR se vejde zhuštěná historie (1 až 4 QR). Kód, QR a zvuk nenesou ilustrace; do souboru je lze přiložit volitelně.',
      'Příjemce vidí náhled „před → po“ a revize přijme, nebo zamítne. Odpověď se vrací kódem a zamítnuté změny lze vrátit.',
    ],
  },
  {
    id: 'sdileni-druziny',
    title: 'Sdílení družiny',
    kind: 'navod',
    text: 'Pravda je u Průvodce: ten družinu posílá, hráč si ji uloží jako kopii.',
    steps: [
      'Průvodce posílá členy, poznámky, schválené zápisy a zkušenosti; jen nové od posledního odeslání, od zvoleného zápisu, nebo celou.',
      'Hráč může jen navrhovat zápisy; Průvodce je přijme, nebo zamítne a zamítnutí se vrátí s další družinou.',
      '„Připsáno“ u zkušeností je vždy jen v zařízení.',
    ],
  },
  {
    id: 'import',
    title: 'Import',
    kind: 'navod',
    text: 'Vlož kód, vyber soubor, naskenuj QR nebo přijmi zvuk. Před uložením uvidíš, co se změní.',
    steps: [
      'Postava: každou příchozí revizi přijmeš, nebo zamítneš; ukáže se i kontrola postavy po přijetí.',
      'Změněno na obou stranách: u každého pole zvolíš „Příchozí“, nebo „Ponechat moje“ (zapíše se revize „Ponecháno moje“).',
      'Družina, předpisy do Grimoáru a odpověď vypravěče se zpracují stejně, s náhledem a potvrzením.',
    ],
  },
]

/** Témata k Příručce, Bestiáři a části Více. */
export const TOPICS_APP: Card[] = [
  {
    id: 'prirucka',
    title: 'Příručka',
    kind: 'navod',
    text: 'Pravidla po ruce: kapitoly v částech knihy, hledání a Rejstřík. Po stažení balíčku fungují i offline.',
    steps: [
      'Hledání (od dvou znaků) prochází kapitoly, bytosti i pojmy.',
      'Kapitoly jsou ve sbalitelných částech; předchozí a další kapitola platí v rámci knihy.',
      'Pojmy v textu jsou odkazy; kolik jich se ukáže, nastavíš ve Více (Odkazy v textu).',
      'Bez balíčku nabídne aplikace Stáhnout, případně odkaz do SRD.',
    ],
  },
  {
    id: 'rejstrik',
    title: 'Rejstřík',
    kind: 'navod',
    text: 'Herní pojmy z příručky řazené abecedně; každý pojem vede na místa, kde se vysvětluje.',
    steps: [
      'První odkaz hesla je hlavní, ostatní jsou v závorce.',
      'Úvodní oddíl „Začátky knih“ vede na začátek každé knihy.',
    ],
  },
  {
    id: 'bestiar',
    title: 'Bestiář',
    kind: 'navod',
    text: 'Bytosti pro vypravěče: z balíčku jen ke čtení a vlastní bytosti s editorem.',
    steps: [
      'Filtr podle druhu a podle prostředí (ikony, lze vybrat víc; prázdný čtvereček = bez uvedeného prostředí). Řadit jde abecedně nebo podle druhů.',
      'Vlastní bytosti jdou vytvořit, upravit a vyexportovat do souboru; vlastní obrázky jsou jen v zařízení.',
      'Tlačítko „Do konfliktu“ na kartě bytosti ji přidá do konfliktu družiny.',
    ],
  },
  {
    id: 'bestiar-vymena',
    title: 'Import a export bytostí',
    kind: 'navod',
    text: 'Vlastní bytosti se přenášejí jako soubor JSON.',
    steps: [
      'Export uloží zaškrtnuté vlastní bytosti do souboru nebo zkopíruje text; bytosti z balíčku se neexportují.',
      'Import je před uložením zkontroluje a přidá k vlastním bytostem.',
    ],
  },
  {
    id: 'nastaveni',
    title: 'Nastavení',
    kind: 'navod',
    text: 'Nastavení platí jen v tomto zařízení.',
    steps: [
      'Jméno podepisuje změny postav a zápisy družiny (výchozí je „hráč“).',
      'Odkazy v textu: jen první výskyt (výchozí), první a po 5000 znacích, všechny, nebo žádné.',
    ],
  },
  {
    id: 'baliccky',
    title: 'Obsahové balíčky',
    kind: 'navod',
    text: 'Pravidla a Bestiář v rozsahu SRD se stahují z webu aplikace a pak fungují i bez připojení.',
    steps: [
      'Stáhnout, Aktualizovat a Odebrat jsou u každého balíčku; starší sestavení aplikace nabídne stáhnout znovu.',
      'Jiný balíček (např. vlastní) načteš ze souboru .json.',
      'Postava ukládá jen odkazy na obsah a vlastní hodnoty, takže odebrání balíčku postavy nesmaže.',
    ],
  },
  {
    id: 'zvuk',
    title: 'Přenos zvukem a zkouška zvuku',
    kind: 'navod',
    text: 'Kód lze mezi dvěma zařízeními přenést zvukem z reproduktoru do mikrofonu. Je to experimentální funkce.',
    steps: [
      'Vysílat zvukem je u Sdílet, Přijímat zvukem u Importu. Potřebuje povolení mikrofonu a tiché okolí.',
      'Zkouška zvuku: na jednom zařízení „Snímat a vyhodnotit“, na druhém „Přehrát test“. Po 3 s se přehrají tóny a všechny režimy.',
      'Výsledky a špičku vstupu ukáže příjemce; Protokol zkoušek lze zkopírovat. Při selhání zvyš hlasitost a zmenši vzdálenost.',
    ],
  },
  {
    id: 'aplikace',
    title: 'Aplikace a aktualizace',
    kind: 'navod',
    text: 'Aplikace je PWA: po prvním načtení běží i offline.',
    steps: [
      'Nová verze se stáhne na pozadí a nad navigací se ukáže „Obnovit“; rozepsané návrhy zůstanou uložené v zařízení.',
      'Tady uvidíš verzi a datum sestavení a můžeš ručně zkontrolovat aktualizaci.',
      'Nainstalovat jde z nabídky prohlížeče nebo tlačítkem Nainstalovat; na iOS přes Sdílet a Přidat na plochu.',
    ],
  },
]

/** Všechna témata nápovědy (kroky vyhodnocení, složitější situace, pomůcky). */
export const helpTopics = (): Card[] => [...BASIC, ...SITUATIONS, ...TOPICS, ...TOPICS_PARTY, ...TOPICS_APP]
export const helpTopic = (id: string): Card | undefined => helpTopics().find((c) => c.id === id)

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
    ? `#/ctenar/${c.link.replace('#', '/')}`
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
