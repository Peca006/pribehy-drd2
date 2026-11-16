# Plán: krok 11 plánu hodů (pomůcky k výrobě, opravám, léčení, kouzlům, nástrahám a kořisti)

Stav: **návrh k rozhodnutí**, nic z toho není naprogramováno. Navazuje na „Plán: hody a řešení střetů, výzev a zkoušek“
v `TODO.md` (kroky 1 až 10 hotové).

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

## Co v aplikaci už je

- Hody a výsledek: `src/core/character/roll.ts`, panel `Roll.svelte` (zkouška, výzva, střet, manévry, iniciativa, Ohrožení, vyčerpání).
- Zdroje a čerpání: `play.ts` (jen v zařízení), `Resources.svelte`; dočasné Zdroje ze sebezasazené Jizvy.
- Jizvy: `healing.ts` (`easeScar`, `healScar`, `inflictScar`), `ScarDialog.svelte`, tlačítka „Zmírnit o 1“ a „Zahojeno“ v `Characters.svelte`
  (rozhoduje Průvodce mezi výpravami).
- Postup vyhodnocení: `guide.ts`, `Guide.svelte` (karty s odkazy do příručky).
- Hotovost: pole `cash` v haléřích v modelu postavy (v deníku revizí, v QR a při sdílení).
- **Chybí:** Suroviny (v modelu nejsou), lektvary, pomůcky výroby, léčení, nástrah a kořisti.

## Navrhované kroky (každý jde sám nasadit)

### 11a: Suroviny (malý krok, základ pro ostatní)
- Pole `materials` (celé číslo ≥ 0) u postavy vedle `cash`; tlačítka ±, úprava v editoru, `check.ts`, `share.ts` (pole `materials`),
  QR a komprimovaný formát (`compact.ts`), deník revizí.
- **Riziko:** nové pole mění formát sdílení. Staré postavy a staré QR musí zůstat čitelné (chybí-li pole, bere se 0). Nový formát musí
  starší aplikace bez chyby ignorovat nebo odmítnout srozumitelnou hláškou. Pokrýt testy.
- Směna Surovina ↔ groš 1:1 jako jedno tlačítko (odečte z jednoho, přičte druhému).
- **Rozhodnutí:** do deníku revizí (sdílí se, jako Peníze), nebo jen do stavu hry v zařízení (jako čerpání Zdrojů)? Doporučení: deník revizí,
  protože Suroviny přecházejí mezi výpravami stejně jako Peníze.

### 11b: Výroba a opravy
- Dialog „Vyrobit / opravit“ u postavy: druh (nástroj, ochranný, spotřební, nástraha, **oprava**, nouzový), cena předmětu v groších
  (ručně nebo z ceníku balíčku, je-li), návrh ceny v Surovinách (půlka; u oprav 5 × závažnost, ručně přepsatelné), řemeslník (Peníze).
- Dva režimy: **mezi výpravami** (odečte jen Suroviny, bez hodu) a **na výpravě** (předvyplní zkoušku v panelu Hod s doporučeným Ohrožením;
  po výsledku nabídne odečet nebo propálení Surovin; přerušení odkáže na střet).
- Kontrola: Suroviny stačí, jinak nabídne nouzový předmět; upozornění na vyhrazené dovednosti a bravurní dovednost u kvalitních předmětů
  (názvy z balíčku, jinak odkaz).
- Zápis: odečet Surovin jako revize s poznámkou „výroba: …“; volitelně přidat předmět do výbavy.

### 11c: Léčení Jizev
- Dialog „Léčit v magickém okamžiku“ u Jizvy: síla okamžiku (zadá hráč nebo Průvodce), kontrola „síla ≥ závažnost“, ošetřující (jiná
  postava, nebo sám = upozornění na vyčerpání i Zdroje), zkouška (odkaz do panelu Hod), platba **5 Zdrojů za snížení o 1** s volbou vlastností
  (nejdřív vlastnost Jizvy), možnost započíst Suroviny z lektvaru, **ne** Výhodu ani Jizvu. Výsledek zapíše snížení či zahojení.
- **Jizvy na Poutu:** platba pětinásobku Platby (pomocníci jsou v aplikaci, pole Platba ověřit).
- **Lektvary** (volitelná část 11c2): seznam zásobníků u postavy (druh Jizvy, počet Surovin, platnost do slunovratu nebo rovnodennosti jako
  poznámka), výroba lektvaru jako speciální případ 11b, čerpání při léčení. Nouzové lektvary bez Surovin.
- Léčení bytostí (Průvodce): jen informace (bez Sudby, snížit Sudbu v následném konfliktu), tlačítko u bytosti v konfliktu.
- Navazuje na stávající tlačítka „Zmírnit o 1“ a „Zahojeno“ (zůstanou jako ruční zkratka Průvodce).

### 11d: Kouzla a nástrahy (největší, dělit)
- **11d1 Nástrahy:** kalkulátor ceny (základ 3 Suroviny a příplatky podle výtahu výše), seznam připravených nástrah u postavy (druh, cena,
  vložené manévry), „spustit“ jako výzva s předvyplněným panelem Hod; opakované spuštění a nouzové nástrahy jako poznámky v kartě Postup.
- **11d2 Kouzla:** jen pomůcka u zkoušky: kontrolní seznam rituálu (zvuky, gesta, substance, dosah, rozsah, trvání), cena (náročné = 1 Zdroj,
  aktivace schopnosti, substance v Surovinách), rychlá nápověda k obraně a k propadnutí Zdrojů při zmaření. Názvy oborů magie z balíčku.
  **Bez seznamu příkladových kouzel.**
- Karty „Postup“ (heslovité) pro Kouzla, Nástrahy a Léčení v `guide.ts` s odkazy do kapitol 36 a 35 příručky.

### 11e: Kořist
- Panel „Kořist“ u družiny nebo sezení (Průvodce): položky (Vybavení, Peníze, Suroviny, trofeje), rozdělení mezi postavy družiny jedním
  tlačítkem do deníků (Peníze, Suroviny, výbava), poznámka ke zdroji (z které bytosti, kde nalezeno).
- Evidence trofejí (jen název a poznámka; schopnosti využívající trofeje řeší hráč). Zpracování těla na Suroviny jako ruční zadání
  (množství určuje Průvodce, aplikace jen zapíše a připomene, že tělo i trofej se přitom zničí).

## Pořadí a odhad

| Krok | Rozsah | Závisí na | Poznámka |
|---|---|---|---|
| 11a Suroviny | malý | nic | formát sdílení, testy zpětné kompatibility |
| 11c Léčení (bez lektvarů) | střední | 11a (Suroviny) volitelně | využije stávající ScarDialog a healing.ts |
| 11b Výroba a opravy | střední | 11a | panel Hod předvyplnit |
| 11c2 Lektvary | malý až střední | 11b, 11c | zásobník Surovin u postavy |
| 11d1 Nástrahy | střední | 11a, 11b | kalkulátor + výzva |
| 11e Kořist | malý až střední | 11a, družiny | po sezení se hodí nejvíc |
| 11d2 Kouzla | střední | | nejméně přínosné pro aplikaci (hraje se u stolu) |

Doporučené pořadí: **11a, 11c, 11b, 11e, 11d1, 11c2, 11d2**. Každý krok = jedna verze (0.3.x), s testy a záznamem v `CHANGELOG.md`.

## Otevřené otázky k rozhodnutí

1. Suroviny do deníku revizí (sdílejí se), nebo jen do zařízení? Doporučuji deník revizí.
2. Ceny: zadávat v groších (1 groš = 10 haléřů) a Suroviny po jedné, hotovost zůstává v haléřích. Souhlasí to?
3. Kdo léčí: stačí ošetřující zvolený z postav družiny, nebo i volný text („vesnický léčitel“)? Doporučuji obojí.
4. Lektvary: potřebujete evidovat zásobníky, nebo stačí odečet Surovin při léčení? (Evidence je větší práce.)
5. Kouzla: stačí kontrolní seznam a cena, nebo chcete evidovat vlastní kouzla postavy (rituály jako vlastní poznámky)?
6. Kořist: bude hlavně u Průvodce (družina, sezení), nebo i u hráče (rychlé přidání nálezu do vlastní postavy)?
7. Mají se pomůcky zobrazit jen s nainstalovaným balíčkem pravidel (kvůli názvům dovedností), nebo i bez něj s odkazy do SRD? Doporučuji
   bez balíčku holý postup a odkaz do SRD, s balíčkem navíc názvy dovedností.
