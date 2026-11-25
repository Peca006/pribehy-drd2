// Ukázkové dobrodružství a výpravy (vlastní vymyšlený text, ne příklady ze SRD). Slouží k vyzkoušení Výprav a jdou smazat;
// v Dílně se dají obnovit. Všechna ID mají předponu `demo-`, takže se odstraní společně s ostatními ukázkovými daty.
import { ANYTIME, type Adventure, type Expedition, type Incident, type Npc } from '../core/expedition/model'

export const DEMO_ADVENTURE_ID = 'demo-dobrodruzstvi-karavan'
export const DEMO_EXPEDITION_IDS = ['demo-vyprava-karavan', 'demo-vyprava-brod'] as const

const NOW = () => new Date().toISOString()

const npc = (id: string, p: Partial<Npc> & Pick<Npc, 'name'>): Npc => ({
  id: `demo-cp-${id}`,
  look: '',
  conduct: '',
  knowledge: '',
  motive: '',
  group: '',
  notes: '',
  ...p,
})

/** Cizí postavy ukázkového dobrodružství (vlastní vymyšlený text). */
export const demoCast = (): Npc[] => [
  npc('hubert', {
    name: 'Celník Hubert',
    group: 'Celnice',
    look: 'Suchý muž s pečlivě zastřiženým knírem, mluví úředně a nikdy nezvýší hlas.',
    conduct: 'Nesnáší, když ho někdo popohání. Rád se vymlouvá na předpisy, ale slušnost cení.',
    knowledge: 'Ví, kdy a kudy karavan vyjel, a vede knihu převozů.',
    motive: 'chce zachovat pořádek a nepřijít o místo',
  }),
  npc('jarka', {
    name: 'Jarka',
    group: 'Karavan',
    look: 'Mladá vozka s popálenými rukávy, plachá a rychle se červená.',
    conduct: 'Bojí se obvinění, proto se skrývá. Důvěřuje tomu, kdo se k ní zachová laskavě.',
    knowledge: 'Viděla, kdo karavan odklonil, ale neví proč.',
    motive: 'chce se zbavit viny a vrátit se domů',
  }),
  npc('ondrej', {
    name: 'Ondřej převozník',
    group: 'Převoz',
    look: 'Široký a mlčenlivý, ruce jako lopaty.',
    conduct: 'Nejdřív mlčí, pak vybuchne. Pokud se s ním jedná jako s rovným, je ochoten vyjednávat.',
    knowledge: 'Ví o dluhu všechno a ví, kde je karavan.',
    motive: 'chce dostat zaplaceno za roky převozu',
  }),
]

const inc = (id: string, stage: string, p: Partial<Incident> & Pick<Incident, 'title' | 'text'>): Incident => ({
  id: `demo-p-${id}`,
  stage,
  cast: [],
  conditions: '',
  ifSuccess: '',
  ifFailure: '',
  ...p,
})

export const demoAdventure = (): Adventure => ({
  id: DEMO_ADVENTURE_ID,
  name: 'Ukázka: Zbloudilý karavan',
  theme: 'důvěra a dluhy',
  background:
    'Obchodník Radimír Solný dluží převozníkovi Ondřejovi za roky převozu a platit nechce. Ondřej proto nechal Radimírův karavan odklonit na starou uhlířskou stezku, aby ho k placení donutil. Spor se vymkl a vozka Jarka se z viny skrývá.',
  notes: 'První výprava hledá karavan, druhá řeší spor o dluh, který se tím odhalí. Pořadí je jen doporučené.',
  cast: demoCast(),
  expeditionIds: [...DEMO_EXPEDITION_IDS],
  created: NOW(),
  updated: NOW(),
})

export const demoExpeditions = (): Expedition[] => [
  {
    id: DEMO_EXPEDITION_IDS[0],
    name: 'Hledání karavanu',
    adventureId: DEMO_ADVENTURE_ID,
    castIds: ['demo-cp-hubert', 'demo-cp-jarka', 'demo-cp-ondrej'],
    theme: 'komu věřit',
    background:
      'Karavan nezmizel: stojí neporušený u opuštěného milíře na staré uhlířské stezce. Převozník Ondřej tam právě tajně přeprodává část soli, vozka Jarka se ukrývá v lese ze strachu, že ji obviní.',
    hook: 'Radimír Solný slibuje družině třetinu zachráněného zboží a prominutí dluhu u celníka, když najde jeho ztracený karavan.',
    goal: 'Najít karavan a zjistit, co se s ním stalo.',
    style: 'domino',
    nodes: [
      { id: 'demo-uzel-stopa', title: 'Stopa se láme', text: 'Hlavní stezka nikam nevede. Stopy kol ukazují na zarostlou uhlířskou cestu a někdo družinu sleduje.', kind: 'zvrat' },
      { id: 'demo-uzel-noc', title: 'Noc v kolibě', text: 'Bezpečné místo k přespání u staré kolibky. Čas na odpočinek, léčení a rozhovor u ohně.', kind: 'odpocinek' },
    ],
    incidents: [
      inc('rozcesti', '', {
        title: 'Rozcestí s křížem',
        text: 'Stezka se dělí a celník tvrdí, že karavan nahoru nešel. Hrdinové musí rozhodnout, komu věřit: celníkovi, nebo čerstvým stopám.',
        ifSuccess: 'Najdou stopy kol zahnuté na uhlířskou stezku.',
        ifFailure: 'Ztratí den po hlavní stezce, stopy se objeví až o kus dál. Cesta se prodlouží, nezastaví.',
        cast: [{ name: 'Celník Hubert', npcId: 'demo-cp-hubert' }],
      }),
      inc('potok', '', {
        title: 'Rozvodněný potok',
        text: 'Brod je po dešti rozvodněný. Je třeba přejít s lany, nebo najít jinou cestu.',
        ifSuccess: 'Přejdou bez škody a ušetří čas.',
        ifFailure: 'Přejdou, ale část zásob zmokne a zkazí se.',
      }),
      inc('jarka', 'demo-uzel-stopa', {
        title: 'Vozka Jarka',
        text: 'V lese se skrývá vozka z karavanu. Je vyděšená a nechce mluvit, protože se bojí, že ji obviní.',
        conditions: 'Po nalezení stop na uhlířské stezce.',
        ifSuccess: 'Svěří se, co se stalo, a ukáže cestu k vozům.',
        ifFailure: 'Uteče do lesa; k vozům vede stopa přes její úkryt.',
        cast: [{ name: 'Jarka', npcId: 'demo-cp-jarka' }],
      }),
      inc('milir', 'demo-uzel-noc', {
        title: 'Uhelný milíř',
        text: 'Vozy stojí neporušené. Převozník Ondřej právě nakládá část soli pro sebe. Družina může bojovat, vyjednávat, nebo ho udat.',
        ifSuccess: 'Ondřej ustoupí a prozradí, proč karavan odklonil.',
        ifFailure: 'Ondřej uteče s částí zboží a vozy zůstanou bez dozoru.',
        cast: [{ name: 'Ondřej převozník', npcId: 'demo-cp-ondrej' }],
        loot: [
          { id: 'demo-l-kasicka', kind: 'penize', label: 'převozníkova kasička', amount: 12, unit: 'grose' },
          { id: 'demo-l-sul', kind: 'suroviny', label: 'sůl', mark: '🧂', amount: 3 },
          { id: 'demo-l-soudek', kind: 'vybava', label: 'Soudek lepší soli (cenné zboží)' },
          { id: 'demo-l-kotva', kind: 'trofej', label: 'Převozníkova kotvička', note: 'kdo ji má, toho Ondřej nezapomene' },
        ],
      }),
      inc('mlha', ANYTIME, {
        title: 'Mlha na stezce',
        text: 'Hustá mlha, družina se rozdělí a ztrácí směr. Dá se uvést kdykoli, když hra zadrhne.',
        ifSuccess: 'Najdou se a mlha odhalí nečekanou stopu.',
        ifFailure: 'Ztratí se na hodinu a vydají se ze Zdrojů, ale najdou pramen.',
      }),
      inc('zebrak', ANYTIME, {
        title: 'Pocestný žebrák',
        text: 'Starý žebrák nabízí zprávu za jídlo: viděl kolem vozy, ale nikoho, kdo by je hlídal.',
        ifSuccess: 'Dostane jídlo a prozradí směr.',
        ifFailure: 'Odejde uražený a zprávu si nechá, najde se ji jinde.',
      }),
    ],
    resolution:
      'Družina může zboží vrátit Radimírovi (a vyslechnout jeho verzi o dluhu), dohodnout se s Ondřejem, nebo využít dluh k vlastnímu prospěchu. Radimír nemusí být nevinný.',
    notes: 'Příhodu o Jarce uvádějte až po stopách. Kořist z milíře se odhalí podle toho, jak spor dopadne.',
    created: NOW(),
    updated: NOW(),
  },
  {
    id: DEMO_EXPEDITION_IDS[1],
    name: 'Dluh v Mlžném brodě',
    adventureId: DEMO_ADVENTURE_ID,
    castIds: ['demo-cp-hubert', 'demo-cp-ondrej'],
    theme: 'spravedlnost, nebo mír',
    background: 'Starostka Mlžného brodu chce spor o dluh rozhodnout, než se do něj zapojí celá ves. Každá strana mluví jen o své křivdě.',
    hook: 'Po návratu s karavanem prosí starostka družinu, aby před shromážděním vsi rozhodla spor mezi Radimírem a převozníkem.',
    goal: 'Rozhodnout spor o dluh tak, aby ves zůstala pohromadě.',
    style: 'puzzle',
    nodes: [{ id: 'demo-uzel-schuze', title: 'Večerní schůze vsi', text: 'Ves se sejde v hostinci a čeká na rozhodnutí. Co družina zjistila, rozhodne, kam se přikloní.', kind: 'zvrat' }],
    incidents: [
      inc('hostinec', '', {
        title: 'Rozhovor v hostinci',
        place: 'Hostinec U Rozbitého vozu',
        text: 'Hostinský zná obě strany a nechce se do sporu míchat. Za pivo a trpělivost povypráví, jak dluh vznikl.',
        ifSuccess: 'Zjistí, že část dluhu je už dávno splacená.',
        ifFailure: 'Dostanou jen zdrcující jednostranný pohled na Radimíra.',
      }),
      inc('celnice', '', {
        title: 'Zápisy na celnici',
        place: 'Celnice',
        text: 'Celník Hubert vede knihu převozů. Ukáže ji jen tomu, kdo ho nepřekročí v úřední zdvořilosti.',
        ifSuccess: 'Kniha potvrdí, kolik se opravdu dluží.',
        ifFailure: 'Hubert knihu neukáže; jiný záznam je v převozníkově chýši.',
      }),
      inc('chyse', 'demo-uzel-schuze', {
        title: 'Převozníkova chýše',
        place: 'Převozníkova chýše',
        text: 'Ondřej nabídne dohodu: dluh si odpracuje převozem Radimírova zboží zdarma na rok. Radimír s tím nesouhlasí.',
        ifSuccess: 'Obě strany přistoupí na kompromis.',
        ifFailure: 'Spor se vyostří a ves se rozdělí na dva tábory.',
      }),
      inc('svedek', ANYTIME, {
        title: 'Opilý svědek',
        text: 'Opilý drvoštěp tvrdí, že viděl, jak se karavan odklonil. Je třeba rozlišit, co z toho je pravda.',
        ifSuccess: 'Svědectví se potvrdí jinde.',
        ifFailure: 'Svědek si to na ránu nepamatuje, ale spor tím přitvrdne.',
      }),
    ],
    resolution: 'Rozhodnutí může být spravedlivé, nebo smírné. Ves přijme to, co družina dobře odůvodní.',
    notes: '',
    created: NOW(),
    updated: NOW(),
  },
]
