# Plán: krok 11 plánu hodů (pomůcky k výrobě, opravám, léčení, kouzlům, nástrahám a kořisti)

Stav (22. 11. 2026): ✅ hotové jsou všechny kroky kromě Kořisti (11e, čeká na Výpravy). Dokument zůstává jako záznam rozhodnutí
a výtah pravidel. Aktuální otevřené úkoly jsou v `TODO.md`.

## Zásady

- Pomůcky nahrazují papír a kalkulačku, **nerozhodují za hráče ani Průvodce**. Čísla z pravidel jsou výchozí návrh, který
  se dá přepsat (pravidla sama říkají u mnoha cen „orientačně, podle úvahy Průvodce“).
- **Žádné texty pravidel v repozitáři ani v nasazení.** Jen vlastní heslovitý výtah (jako panel Postup vyhodnocení), názvy
  dovedností a popisy jen z nainstalovaných balíčků, jinak odkaz do SRD. Seznamy příkladů kouzel, pastí a jedů se neopisují.
- Každý krok musí být použitelný sám a nic nesmí rozbít sdílení postav (QR, soubory, zvuk) ani deník revizí.

## Co pravidla říkají (vlastní výtah)

| Téma | Jádro |
|---|---|
| **Suroviny** | Druhá „měna“ vedle Peněz. Hráč vede jen **celkový počet**. Směna 1 Surovina = 1 groš bez ztráty (mezi výpravami). |
| **Výroba** | Podmínky (místo, čas, pomůcky) posuzuje Průvodce. Cena v Surovinách: u nástrojů a ochranných předmětů zhruba **polovina ceny předmětu** (orientačně), u spotřebních předmětů pevně daná. Bez Surovin jen **nouzový** předmět. Kvalitní předměty jen s bravurní dovedností. Některé předměty jen s vyhrazenou dovedností (třaskaviny, žíraviny, plynné jedy). |
| **Výroba mezi výpravami** | Předpokládá se dostatek Zdrojů, proto se spotřebují **jen Suroviny**. Na výpravě bez přerušení **zkouška**; neúspěch obvykle propálí vložené Suroviny. Přerušení = střet (úspěch výroby pak jen pokračuje). Úspěšná výroba nemá následek (jen výjimečně Ohrožení nebo Výhoda), nikdy Jizvu. |
| **Opravy** | Stejné jako výroba, jen cena: **5 Zdrojů za stupeň závažnosti**, placeno Surovinami. Řemeslník: dražší, Penězi. |
| **Léčení Jizev** | Jen v **magickém okamžiku** (síla okamžiku ≥ závažnost léčené Jizvy). Jeden ošetřující, jedna Jizva, jeden ošetřovaný. Zkouška ošetřujícího (úspěch hodem nebo vyčerpáním). Ošetřovaný platí **5 Zdrojů za snížení o 1** (nejdřív Zdroje vlastnosti Jizvy, doplatit z ostatních; nahradit lze Surovinami z lektvaru, **ne** Výhodou ani další Jizvou). Léčit sám sebe jde, ale platí se vyčerpání i Zdroje. Léčení bytostí: bez Sudby, ale únava se promítne do dalšího konfliktu. |
| **Jizva na Poutu** | Stejný postup, ale platí se **pětinásobek Platby** pomocníkovi (ne Pouto). |
| **Lektvary, masti, odvary, nektary** | Zásobník Surovin pro jeden druh Jizvy: každá vložená Surovina ušetří 1 Zdroj při léčení. Dá se použít postupně na víc pacientů. Platí do dalšího slunovratu nebo rovnodennosti. Nouzové lektvary Zdroje neušetří. |
| **Neodkladné ošetření** | První pomoc, Jizvu nezhorší ani nezmění; nejtěžší Jizvy se řeší opakovanou výzvou (každý neúspěch zhorší o stupeň). |
| **Kouzla** | Základní kouzlo nestojí nic; **náročné** kouzlo stojí 1 Zdroj (jako náročná akce kohokoli); aktivace zvláštních schopností se platí; **substance** se platí Surovinami (cena podle magie). Zmařené kouzlo propadne vložené Zdroje. Rituál: zvuky, gesta, substance; dosah, rozsah, trvání; obrana (přerušení rituálu, únik, zrušení, protikouzlo). |
| **Nástrahy** | Základ ceny **3 Suroviny**. **+1** za schopnost zabít nebo trvale vyřadit, **+1** za každý vložený manévr (rozsáhle, přesně, mocně, lstivě), **+1** za pokročilou nástrahu z vyhrazené dovednosti, **+1** za každou další kombinovanou pokročilou vlastnost. Posílení zvláštní schopností má cenu u schopnosti. Pravidla vyhodnocení: ukryté, přímé ovládání, spuštění jako následek akce, odstranění, dobrovolné spuštění, opakované spuštění, nouzové nástrahy. |
| **Kořist** | Vybavení, Peníze a Suroviny najde kdokoli; zamčené nebo hlídané věci chtějí dovednosti. Zpracování těla = jídlo, kůže, kosti (obchod, základ výroby). **Trofeje** (jen z tohoto světa, ne z nemrtvých): prodej, zvláštní schopnosti. Alchymista z těl a rostlin vyrobí Suroviny (nevratně). Množství určuje Průvodce. |

## Kroky (stručně, podrobnosti v `CHANGELOG.md`)

| Krok | Verze | Stav a klíčová rozhodnutí |
|---|---|---|
| 11a Suroviny | 0.3.0 | ✅ Evidují se jako číslo (`rawMaterials`), volitelně druhy `rawMaterialKinds` (značka 1 až 2 znaky + název) u každé postavy zvlášť, přenášené s postavou; druh s nenulovým zůstatkem nejde smazat; při spotřebě se druh ctí (volba skupiny, ne pravidlo). V deníku revizí. |
| 11c Léčení Jizev | 0.3.1 | ✅ Dialog „Léčit…“ (síla okamžiku, stupně, Zdroje navíc z lektvaru, ošetřující jako volný text, platba 5 Zdrojů za stupeň, nový popis Jizvy). Hod řeší ošetřující, u cizí postavy vypravěč nebo automatický úspěch. Pomocníci (Pouto, Platba) zatím nejsou. |
| 11f Hotovost | 0.3.2 | ✅ Tři hodnoty (dukáty, groše, haléře) bez automatického přetékání; čerpání pod nulu rozmění minci shora. Ukládá se jedno číslo v haléřích (`cash`). |
| 11b Výroba a opravy | 0.3.3 | ✅ Dialog „Vyrobit / opravit“ (nástroj, ochranný, spotřební, nástraha, oprava, nouzový), návrh ceny v Surovinách (půlka, u oprav 5 × závažnost, přepsatelné), řemeslník za Peníze, režim mezi výpravami (bez hodu) a na výpravě (předvyplněný panel Hod, 0.3.9). |
| 11c2 Lektvary | 0.3.4 | ✅ Seznam lektvarů, mastí, odvarů a nektarů: vlastnost (zdroj), druh Jizvy, počet Surovin v zásobníku, poznámka; nabízejí se v dialogu Léčit. Od 0.4.2 jako předpisy v Grimoáru. |
| 11d1 Nástrahy | 0.3.5 | ✅ Kalkulátor ceny (základ 3 Suroviny + příplatky), seznam nástrah u postavy, spuštění jako výzva s předvyplněným panelem Hod. |
| 11d2 Kouzla | 0.4.0 | ✅ Viz Grimoár níže. |
| 11e Kořist | | Čeká na milník Výpravy (viz `TODO.md`). |
| Názvy dovedností | 0.3.9 | ✅ V kartách Postup vyhodnocení z balíčku, jinak odkaz do SRD. Do dialogů výroby a nástrah patří k Nápovědě napříč aplikací (`TODO.md`). |

Rozhodnutí z 16. 11. 2026: Suroviny do deníku revizí i s druhy; Hotovost zůstává ve třech hodnotách; léčí ošetřující (volný text);
lektvary stručně (vlastnost + druh Jizvy + počet Surovin); kouzla rozhodnuta 21. 11. (Grimoár); kořist jen jako podpora
vypravěče u Výprav.

## Verze 0.4.0 až 0.4.2: Kouzla a Grimoár (rozhodnuto 21. 11. 2026)

Stav: ✅ etapy 0, A až E hotové (kouzla u postavy 0.4.0, lektvary, nástrahy a výrobky jako předpisy 0.4.2, bod 7 revize 0.4.3).

### Rozhodnutí
1. **Grimoár (sklad předpisů) patří hráči, ne postavě.** Úložiště na zařízení (IndexedDB); používání je nepovinné, kouzlo uložené u postavy v něm vzniká na pozadí.
2. **Předpis = jedna instance, postavy se na ni odkazují.** Stabilní `id` a `contentHash` (SHA-256 normalizovaného názvu, parametrů, popisu a cen). Od 0.4.5 jsou název a popis součástí identity předpisu.
3. **Přenos postavy nese použité předpisy.** Po importu se předpis porovná s Grimoárem příjemce: stejný hash = použije se existující, jiný hash = nový předpis; stejné `id` s jiným hashem nikdy tiše nepřepíše, hráč dostane upozornění.
4. **Úprava předpisu se projeví u všech postav na zařízení**, je tu volba „Uložit jako novou variantu“; mazání použitého předpisu vypíše postavy.
5. **Ad hoc sesílání** bez názvu a bez ukládání; uložit lze nepovinně (pak je povinný název).
6. **Přidání předpisu k postavě našeptává podle názvu** (bez diakritiky a velikosti písmen).
7. **Obory magie z balíčku, hlídané podle schopností postavy;** výjimka volba „Vlastní obor“. Alternativní povolání až po Výpravách.

### Rizika
- **Velikost QR a kódu** při sdílení postavy s předpisy (hlídá `compact.ts` a test velikosti).
- **Formát sdílení** má vlastní číslo verze (`SHARE_VERSION`), starší aplikace import srozumitelně odmítne.

## Formát dat a migrace (průřezově, pohlídat od 11a)

Zjištěný stav: postavy a družiny jsou v IndexedDB (`drd2-data`, `src/core/db.ts`) jako objekty bez vlastního čísla verze. Chybějící pole se
při čtení doplní výchozí hodnotou (`drafts.ts`: např. `cash: num(r.cash) ?? 0`), takže přidání pole starým datům neublíží a verzi databáze
není třeba zvyšovat (ta se mění jen při novém úložišti). Přenosové formáty mají vlastní `v` (`SHARE_VERSION`, `PARTY_SHARE_VERSION`) a při
nesouhlasu odmítnou import. V JSON chybí pole, v IndexedDB je `undefined` (ne `null`); kód to bere stejně.

Zásady, které navrhuji držet:
1. **Přidání volitelného pole** (jako `materialKinds`): bez zvýšení verze, chybějící = výchozí hodnota; starší aplikace nové pole ignoruje.
2. **Změna významu nebo odstranění pole**: zvýšit číslo formátu a napsat převodní funkci stará → nová.
3. **Před první beta verzí** přidat k uloženým postavám a družinám pole `schema` (číslo formátu dat) a řetězec funkcí `migrate(n → n+1)`
   spouštěný při čtení; zavést zálohu: export všech dat do jednoho `.json` s číslem formátu a import, který data převede. Výhoda JSON:
   čitelný, převoditelný, bez vazby na prohlížeč.
4. **Dokument `FORMAT.md`** (formát postavy, družiny, přenosu, ukázky, tabulka verzí a změn) založit před první beta verzí a od té chvíle
   každou změnu formátu zapisovat sem i do `CHANGELOG.md`.
5. Do té doby („čert vem data“) lze formát měnit volně; já budu u každé změny formátu upozorňovat, zda jde o 1. nebo 2.
