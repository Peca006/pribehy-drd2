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

### 11a: Suroviny (malý až střední krok, základ pro ostatní) — HOTOVO ve verzi 0.3.0

Implementováno s názvy `rawMaterials` a `rawMaterialKinds` (druh = `{mark, name, count}` podle ID); `materials` v textu níže čti jako `rawMaterials`.
Souhrnný řádek při evidenci druhů ukazuje součet a řádek „·“ je počet bez druhu.

**Rozhodnutí uživatele:**
- Suroviny se evidují jako **číslo**. Volitelně **druhy** (značka 1 až 2 znaky unicode včetně emotikon + název, vše v jednom řádku),
  protože v příběhu může být potřeba umět vysvětlit, kde postava k Surovinám přišla (bylinky z cest, hřebíky z kovárny).
- Druhy jsou **u každé postavy zvlášť**. Při přenosu hráč ↔ vypravěč se přenese i seznam druhů s názvy, kolize přepisuje vypravěč.
- Druh s **nenulovým zůstatkem nejde smazat**.
- Bez druhů: jeden řádek `✎ Suroviny [−] ## [+]`. S druhy: souhrnný řádek ukazuje **součet bez ±**, pod ním řádek za každý druh se značkou,
  číslem a ±. Značka místo celého názvu, aby se řádek vešel (název v dialogu).
- Ťapnutí na ✎ otevře dialog: seznam druhů, přidat, přejmenovat, smazat (jen s nulou).
- Evidují-li hráči druhy, **ctí se i při spotřebě** (léčivý čaj z hřebíků neuvaříš): výroba a léčení nabídnou, z jakého druhu se odečítá.
  Pravidla sama druhy nerozlišují, takže jde o volbu skupiny, ne o pravidlo (platí jen u postav, které druhy mají).

**Navržený model (k potvrzení):**
- `materials: number` (Suroviny bez druhu) a `materialKinds: { id, mark, name, count }[]`. Celkem = `materials` + součet druhů.
- Je-li seznam druhů prázdný, chová se vše jako dosud jedno číslo. Řádek „bez druhu“ zůstává i po zavedení druhů (nálezy, které si
  hráč netřídí); šlo by ho skrýt, když je 0.
- Revize deníku: změny jdou po polích (`materials`, `materialKinds`), jako `cash`; přidání a smazání druhu je revize s poznámkou.

**Úkoly:** model, `drafts.ts` (normalizace chybějících polí), `check.ts`, `share.ts` a `compact.ts` (pole v přenosu a QR), editor a výpis
postavy, dialog druhů, testy (staré postavy bez polí, přenos, smazání druhu s nenulovým počtem, součet).

### 11b: Výroba a opravy: HOTOVO ve verzi 0.3.3 (bez lektvarů a bez předvyplnění panelu Hod; výsledek se zapisuje ručně)
- Dialog „Vyrobit / opravit“ u postavy: druh (nástroj, ochranný, spotřební, nástraha, **oprava**, nouzový), cena předmětu v groších
  (ručně nebo z ceníku balíčku, je-li), návrh ceny v Surovinách (půlka; u oprav 5 × závažnost, ručně přepsatelné), řemeslník (Peníze).
- Dva režimy: **mezi výpravami** (odečte jen Suroviny, bez hodu) a **na výpravě** (předvyplní zkoušku v panelu Hod s doporučeným Ohrožením;
  po výsledku nabídne odečet nebo propálení Surovin; přerušení odkáže na střet).
- Kontrola: Suroviny stačí, jinak nabídne nouzový předmět; upozornění na vyhrazené dovednosti a bravurní dovednost u kvalitních předmětů
  (názvy z balíčku, jinak odkaz).
- Zápis: odečet Surovin jako revize s poznámkou „výroba: …“; volitelně přidat předmět do výbavy.

### 11c: Léčení Jizev — HOTOVO ve verzi 0.3.1 (včetně úpravy 11c-2: tlačítko „Zmírnit“ otevře dialog s popisem, závažností, lektvarem a rozdělením Zdrojů)

Hotovo: dialog „Léčit…“ u Jizvy (síla okamžiku, počet stupňů, „Zdroje navíc“ z lektvaru, ošetřující, zkouška, platba 5 Zdrojů za stupeň, revize).
Pomocníci (Pouto, Platba) v aplikaci zatím nejsou, Jizvy na Poutu se neřeší. Léčení bytostí je jen informace.

**Rozhodnutí uživatele (k doplnění v 11c-2, malá úprava):**
- Hod řeší **ošetřující** svou dovedností, často jiný člen družiny; u cizí postavy hod řeší vypravěč, nebo v odůvodněném případě připustí
  automatický úspěch. Ošetřovaný si v aplikaci jen sníží Jizvu a **upraví její text** (např. „otevřená rána“ → „hojící se strup“), případně
  i způsobení. Do dialogu proto přibude pole „Nový popis Jizvy“ (předvyplněné stávajícím, skryté při úplném zahojení). Léčí-li se postava
  sama, je to jasné (komplikace, vyčerpání i Zdroje).
- Ošetřující zůstává nepovinný (jméno jako volný text); potvrzení „zkouška se podařila“ platí i pro automatický úspěch vypravěče.

### 11d: Kouzla a nástrahy (největší, dělit)
- **11d1 Nástrahy (HOTOVO ve verzi 0.3.5, bez předvyplnění panelu Hod):** kalkulátor ceny (základ 3 Suroviny a příplatky podle výtahu výše), seznam připravených nástrah u postavy (druh, cena,
  vložené manévry), „spustit“ jako výzva s předvyplněným panelem Hod; opakované spuštění a nouzové nástrahy jako poznámky v kartě Postup.
- **11d2 Kouzla:** jen pomůcka u zkoušky: kontrolní seznam rituálu (zvuky, gesta, substance, dosah, rozsah, trvání), cena (náročné = 1 Zdroj,
  aktivace schopnosti, substance v Surovinách), rychlá nápověda k obraně a k propadnutí Zdrojů při zmaření. Názvy oborů magie z balíčku.
  **Bez seznamu příkladových kouzel.**
- Karty „Postup“ (heslovité) pro Kouzla, Nástrahy a Léčení v `guide.ts` s odkazy do kapitol 36 a 35 příručky.

### 11e: Kořist (odloženo až k modulu dobrodružství / Výpravy)

**Rozhodnutí uživatele:** u hráče stačí zápis kořisti v dobrodružství jako celku a jednotlivé položky (Suroviny, Peníze, výbava) u postav; zvláštní
panel Kořist pro hráče nepotřebujeme. Smysl má až jako **podpora vypravěče**: kořist si **předdefinuje** v dobrodružství, při odhalení ji
**upřesní a zafixuje hodnoty** (tedy náhodné nebo předběžné hodnoty se uzamknou) a **rozdělí** postavám podle dohody (do deníků: Peníze, Suroviny
s druhem, výbava). Tohle patří k milníku **Výpravy** (sekce pro vypravěče, ukázkové dobrodružství), proto 11e počká na něj.
- Trofeje: jen název a poznámka. Zpracování těla na Suroviny jako ruční zadání (množství určuje Průvodce).

### 11f: Hotovost: HOTOVO ve verzi 0.3.2 (nakonec jako tři samostatně uložené hodnoty, bez automatického přetékání nahoru; čerpání pod nulu rozmění minci shora)

**Rozhodnutí uživatele:** Hotovost zůstává zvlášť v **dukátech, grošech a haléřích**, ale ovládání úsporně, ideálně v jednom až dvou řádcích:

| Dukáty | Groše | Haléře |
|---|---|---|
| [−] ## [+] | [−] ## [+] | [−] ## [+] |

- **Plus** na hodnotě 9 přeteče do vyššího řádu (haléře → groše → dukáty), **mínus** na 0 si „půjčí“ z vyššího řádu (opačně ne: změna vyššího řádu nemění
  nižší). Ukládá se dál jedno číslo v haléřích (`cash`), mění se jen zobrazení a ovládání, **formát se nemění**.
- Volitelně dotaz, když přetečení nebo půjčka zasáhne **dukáty** (fikčně nemusí být snadné dukát rozměnit).
- Stejné ovládání použít u cen ve výrobě a opravách (11b) a u placení řemeslníka.
- Jednotky: 1 groš = 10 haléřů, 1 dukát = 10 grošů.

## Pořadí a odhad

| Krok | Rozsah | Závisí na | Poznámka |
|---|---|---|---|
| 11a Suroviny | malý | nic | HOTOVO 0.3.0 |
| 11c Léčení | střední | 11a | HOTOVO 0.3.1 |
| 11c-2 Úprava dialogu léčení | malý | 11c | nový popis Jizvy, výběr vlastního lektvaru až po 11c2 |
| 11f Hotovost (dukáty, groše, haléře) | malý | nic | jen zobrazení, formát beze změny |
| 11b Výroba a opravy | střední | 11a, 11f | panel Hod předvyplnit; výroba lektvaru vytvoří záznam lektvaru |
| 11c2 Lektvary (stručná evidence) | malý až střední | 11b, 11c | viz níže |
| 11d1 Nástrahy | střední | 11a, 11b | kalkulátor + výzva |
| 11e Kořist | střední | milník Výpravy | podpora vypravěče, odloženo |
| 11d2 Kouzla | střední | | **odloženo** (uživatel si pravidla nejdřív načte) |

Doporučené pořadí: **11c-2, 11f, 11b, 11c2, 11d1**, pak podle Výprav 11e a podle rozhodnutí 11d2. Každý krok = jedna verze (0.3.x), s testy a záznamem v `CHANGELOG.md`.

### 11c2: Lektvary (stručná evidence): HOTOVO ve verzi 0.3.4

Opravuje dřívější závěr „lektvary se neevidují“. Postava má seznam lektvarů, mastí, odvarů a nektarů; u každého se eviduje **na co je**:
- **vlastnost (zdroj)**: Tělo, Duše, Vliv (podle druhu: masti Tělo, odvary Duše, nektary Vliv, lektvary obecně),
- **druh Jizvy** jako krátký text (popálenina, sečné/bodné/drtivé poranění, fobie, panické ataky a podobně, jak uvádějí pravidla u lektvarů),
- **počet Surovin** v zásobníku (Surovina ušetří 1 Zdroj při léčení) a volitelná poznámka (platnost do slunovratu nebo rovnodennosti).
V dialogu Léčit se pak nabídnou lektvary shodné vlastnosti s předvyplněným počtem; „Zdroje navíc“ zůstává možné zadat i ručně (cizí lektvar).
Výroba lektvaru v 11b vytvoří záznam. Nouzové lektvary (bez Surovin) se neevidují. Pozor na formát sdílení: nové pole `potions` (jen přidání pole).

## Rozhodnutí k otázkám (16. 11. 2026)

1. **Suroviny do deníku revizí:** ano, i s druhy (hotovo, 11a).
2. **Ceny:** Hotovost zůstává zvlášť v dukátech, grošech a haléřích, úsporně v jednom až dvou řádcích, s přetékáním (viz 11f). Suroviny po jedné.
3. **Kdo léčí:** volný text pro ošetřujícího (často jiný člen družiny); hod řeší ošetřující, u cizí postavy vypravěč nebo automatický úspěch. Ošetřovaný si
   sníží Jizvu a upraví její text (viz 11c, doplnění).
4. **Lektvary:** stručně evidovat, na co jsou (vlastnost + druh Jizvy + počet Surovin), viz 11c2.
5. **Kouzla:** odloženo, uživatel si nejdřív pravidla načte (11d2).
6. **Kořist:** hráč jen zápisem v dobrodružství a položkami u postav; panel Kořist až jako podpora vypravěče u modulu Výpravy (11e).
7. **Názvy dovedností:** ano, holé názvy a vlastnost (zdroj) z balíčku, jinak odkaz do SRD. Bez balíčku holý postup a odkaz do SRD.

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
