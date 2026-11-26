# Změny

## Nevydáno

- **Přijmout obsah (Dílna → 📥):** jedno místo pro soubor, vložený kód nebo QR. Aplikace pozná výpravu, dobrodružství, cizí postavy, bytosti, Háv (`.drdskin`) i balíček postavy či družiny (ten předá do Importu postav), ukáže souhrn a nic neuloží bez potvrzení. Nic se nepřepisuje, vždy vznikne nová kopie s novými ID.
- **Sdílení výprav:** u výpravy, dobrodružství (s výpravami a cizími postavami) a vlastních cizích postav je „Sdílet“: soubor, kód nebo Sdílet… Posílá se i tajné pozadí a příhody (vypravěč jinému vypravěči); rozehraná vedení ne. Výprava je soběstačná: cizí postavy z dobrodružství se přiloží. Tím je hotový i export a import výprav souborem.

## 0.6.0 (26. 11. 2026)

- **Švadlena, editor Hávů:** Dílna → Švadlena (🪡). Vlastní Háv vznikne jako kopie vestavěného, nainstalovaného nebo prázdného základu; vestavěné Hávy se nikdy nemění. Úpravy se ukládají samy, vedle formuláře je živý náhled aplikace v rámečku zařízení (včetně širokého okna), Háv jde použít a exportovat do `.drdskin`. U vlastních Hávů v Šatníku je tlačítko Upravit.
- **Švadlena, tokeny:** barvy, písmo a stíny, zaoblení, mezery, tvary panelů, tlačítek a oken, průhlednost panelů, poloha lišty, název, autor, licence a schéma. Každá hodnota prochází stejnou kontrolou jako import; neplatný stav (i slabý kontrast) se neuloží a editor ukáže důvod.
- **Švadlena, obrázky:** nahrání PNG, WebP, JPEG a SVG z počítače se stejnou kontrolou a mezemi jako v souboru Hávu (typ podle obsahu, rozměry, SVG bez skriptů a odkazů ven; 32 obrázků, 2 MB, 16 Mpx). Obrázky se přiřazují rolím (pozadí, panely, tlačítka, lišta, dělicí čára, okna, záhlaví), ikonám záložek a rohovým ozdobám.
- **Švadlena, varianty:** varianty podle velikosti okna (šířka, orientace, nízké okno) s pořadím, přepsáním tokenů a rolí a souhrnem pokrytí všech 12 kombinací okna.
- **Průhledné panely:** nový token Hávu `--drd-panel-opacity` (60 až 100 %), pod panelem prosvítá pozadí stránky. Podzemí má 82 %.
- **Dílna a Šatník:** tlačítka „❓ Nápověda“, „🧥 Šatník“ a „🪡 Švadlena“; sekce v Šatníku se jmenuje „Háv“.

## 0.5.11 (25. 11. 2026)

- **Oprava obnovy ze zálohy:** obnova do zařízení, kde záznamy ještě nejsou (například nový telefon), selhávala s hláškou „could not be cloned“. Obnova z Dílny → Záloha a obnova dat teď funguje i do prázdného zařízení.
- **Souhrn zálohy:** náhled i výsledek obnovy uvádí i dobrodružství, vedení výprav a sezení.

## 0.5.10 (25. 11. 2026)

- **Vedení hry, časomíra sezení:** nová stránka **Hra** u družiny (jen pro Průvodce, Družina → Hra). Klepnutím na hráče se přepíná, komu čas běží; pauza, pokračování a ukončení sezení se souhrnem. Pruhy času mají společné měřítko. Čas se počítá z časových razítek, takže přežije uspání telefonu i obnovení stránky; displej se při hře nezhasíná (kde to prohlížeč umí). Časy zůstávají jen na zařízení Průvodce.
- **Spravedlivý prostor:** po deseti minutách hry upozornění na hráče pod 70 % spravedlivého dílu; člen může být „mimo hru“ a do dílu se nepočítá.
- **Plán podle délky sezení:** zbývá celkem a na hráče, odhad podle tempa odehraných příhod vybraného vedení výpravy, jestli se zbývající příhody stihnou.
- **Krátký odpočet:** 10 s, 30 s, 1 min, 2 min nebo vlastní čas, nezávislý na hlavní časomíře, se zvukem a vibrací na konci (jde vypnout).
- **Data a záloha:** nové úložiště sezení (databáze v9) a volitelný seznam `sittings` v záloze; starší zálohy a aplikace fungují beze změny (`FORMAT.md`).
- **Nápověda:** nové téma „Hra: časomíra a spravedlivý prostor“.

## 0.5.9 (25. 11. 2026)

- **Záhlaví a ozdoby (Šatník, M3c):** Háv může mít záhlaví (pás s obrázkem nad obsahem, role `header`) a až osm rohových ozdob (pole `ornaments`), které se kreslí jen do volného bočního okraje a nikdy nepřekryjí obsah. Na telefonu na výšku se neukážou. Podzemí má měděné záhlaví (na nízkém viewportu vypnuté) a čtyři rohové ozdoby v širokém okně.
- **Záhlaví vzhledu:** Dílna → Spodní lišta → Záhlaví vzhledu (podle vzhledu, skrýt); v náhledu Hávu v Šatníku se volba ignoruje.

## 0.5.8 (25. 11. 2026)

- **Tvary ploch (Šatník, M3b):** Háv může seříznout rohy panelů, tlačítek a oken (tokeny `--drd-shape-panel|button|dialog`: `rect`, `chamfer`, `notch`, velikost `--drd-shape-size` 2 až 16 px). Podzemí má seříznutá tlačítka a okna a panely se dvěma protilehlými rohy. Ohnisko seříznutého tlačítka zůstává při ovládání klávesnicí viditelné.

## 0.5.7 (25. 11. 2026)

- **Poloha lišty (Šatník, M3a):** Háv může určit, kde je hlavní lišta: dole, nahoře, nebo jako svislý pruh vlevo či vpravo, zvlášť pro každou kombinaci viewportu (token `--drd-nav-position` ve `variants`). Podzemí má na telefonu na šířku a v širokém okně svislý pruh vlevo, na výšku zůstává lišta dole.
- **Vlastní poloha lišty:** Dílna → Spodní lišta → Poloha lišty (podle vzhledu, dole, nahoře, vlevo, vpravo) přebije Háv; v náhledu Hávu v Šatníku se volba ignoruje.

## 0.5.6 (25. 11. 2026)

- **Sluj se zvýrazní:** když je otevřená sekce, která není v liště (Příručka, Bestiář a Grimoár ve výchozím stavu, Šatník), svítí záložka Sluj.
- **Nápověda:** nové téma „Spodní lišta, Sluj a Dílna“.

## 0.5.5 (25. 11. 2026)

- **Sluj a Dílna místo Více:** poslední záložka se jmenuje **Sluj** (ikona 🐲, v Podzemí vchod do jeskyně). Je to rozcestník s dlaždicemi Příručka, Bestiář a Grimoár, hledáním do Příručky (když jsou nainstalované knihy) a tlačítkem **Dílna**. Dílna (⚗️) je nastavení a data: nastavení, Spodní lišta, balíčky, záloha, Šatník, nápověda a O aplikaci.
- **Nová výchozí lišta:** Postava, Družina, Výpravy a Sluj; vejde se na telefon bez posunu. Příručka, Bestiář a Grimoár jsou ve výchozím stavu jen ve Sluji a do lišty jdou přidat v Dílně → Spodní lišta („Jen ve Sluji“ ↔ „V liště“). Nedotčená dřívější lišta se přepne na novou, upravená zůstane.

## 0.5.4 (25. 11. 2026)

- **Háv Podzemí pro všechny:** vzhled Podzemí (retro RPG) se jednorázově zapne všem, aby si změny všimli. Jiný vzhled (včetně „Podle systému“) se zvolí v Šatníku (Více → Šatník) a od té chvíle se volba respektuje.

## 0.5.3 (25. 11. 2026)

- **Spodní lišta na telefonu:** záložky se už nemačkají. Střed lišty se posouvá do stran (se zarážením a stíněním okrajů), jedna záložka je přišpendlená vlevo (výchozí Postava) a jedna vpravo (výchozí Více). Otevřená záložka se dorolovala do viditelné části.
- **Nastavení lišty:** Více → Spodní lišta: pořadí záložek, skrytí a přišpendlení vlevo či vpravo, „Vrátit výchozí“. Jen pro toto zařízení; Více nejde skrýt.
- **Nový výchozí vzhled:** aplikace se poprvé otevře v Hávu Podzemí (retro RPG). Kdo si už zvolil jiný vzhled, včetně „Podle systému“, zůstane u své volby; změnit jde v Šatníku.

## 0.5.2 (25. 11. 2026)

- **Šatník, role `dialog`:** Háv může mít vlastní rám oken. Všech deset dialogů aplikace (potvrzení, kouzla, lektvary, jizvy, pasti, recepty, účastníci a další) má sjednocený vzhled v jednom pravidle, takže Háv mění všechny najednou. Podzemí má ozdobný zlatý rám s rubíny.
- **Oprava:** šířka okraje u obrázkových rolí je v samostatné vlastnosti `border-width` (zkratka s proměnnou o čtyřech hodnotách byla neplatná a okraj se nevykreslil).

## 0.5.1 (25. 11. 2026)

- **Anonymní měření (GoatCounter):** na ostrém webu se měří, kolik lidí aplikaci otevírá, v jaké verzi, kolik se stáhlo balíčků (`balicek/<id>`) a kolik nových verzí (`aktualizace`). Bez cookies a bez osobních údajů, z aplikace se neposílá žádný obsah ani postavy. Neměří se při vývoji a v testech, při nastaveném „Do Not Track“ ani offline; skript je z jiné domény a service worker ho neukládá. Informace je ve Více → Aplikace.
- **Pod kapotou:** `core/stats.ts` (načtení skriptu, fronta událostí) s unit testy.

## 0.5.0 (24. 11. 2026)

- **Výpravy (nová sekce pro Průvodce):** tři vrstvy. *Dobrodružství* je lehký kontejner (téma, pozadí, poznámky, výpravy v doporučeném pořadí), *výprava* je příprava podle SRD (zápletka, cíl, styl, uzlové body, příhody v balíčcích před prvním uzlem, po uzlech a kdykoli, rozuzlení) a *vedení* je rozehraná hra jedné družiny s jednou výpravou. Vedení odkazuje na přípravu živě, takže úprava přípravy se projeví i v rozehrané hře. Pozadí a příhody jsou tajné a nikam se nesdílejí.
- **Při hře:** stav příhod (nasadit, odehráno s úspěchem, neúspěchem nebo jinak, odložit), uzlové body, ukazatel tempa Zdrojů, improvizované příhody s uložením do přípravy a přechod do konfliktu s předvyplněnými bytostmi. U družiny jsou rozehrané výpravy a přehled „Co teď vedu“.
- **Uzavření výpravy:** návrh zápisu do žurnálu družiny z odehraných příhod (Průvodce upraví a schválí), stav „hotová“ a nabídka další výpravy dobrodružství.
- **Kořist (11e):** předdefinovaná u příhody (peníze, suroviny s druhem, výbava, trofeje), při hře se odhalí, upřesní a rozdělí členu družiny. Postavě na tomto zařízení se zapíše do deníku, jinak vznikne zápis v žurnálu.
- **Cizí postavy:** zásoba postav u dobrodružství (vzhled a povaha, jednání a vztahy, vědomosti, motivace, skupina, vazba na bytost z Bestiáře), výběr do výprav, vlastní postavy samostatných výprav, odkaz z příhod a při hře karta s motivací a přehled podle skupin.
- **Ukázka a inspirace:** vlastní ukázkové dobrodružství se dvěma výpravami a třemi cizími postavami v ukázkových datech; v přípravě jen pro čtení koncept družiny, příběhy postav a cíle místních postav.
- **Šatník (Háv, `.drdskin`):** nový modul ve Více. Formát a validace Hávu (komunitní vstup se kontroluje, nic se neskládá do textu CSS), čtení a zápis souboru `.drdskin`, úložiště Hávů a volba vzhledu za běhu, obrazovka se seznamem vzhledů, importem, exportem a náhledem na třídách zařízení a tři vestavěné Hávy (Pergamen, Noc, Podzemí). Popis: `WARDROBE.md`.
- **Skinování:** role tokenů rozdělené na border, text-muted, danger, success, warning, scrim a shadow; spodní pruhy a navigace jsou „lepivé“ (sticky) a nezakrývají konec stránky.
- **Data:** nová úložiště `adventures`, `expeditions`, `runs` (DB v8, schéma 1, bez migrace starých dat). Záloha je nese jako volitelné seznamy, `BACKUP_VERSION` zůstává 1 a starší zálohy se obnoví. Změny v `FORMAT.md`.
- **Pod kapotou:** nástroje Kartotéky (`tools/kartoteky`: taxonomie, export karet a kontrola proti Fafrinově sadě) a zápis výsledků zkoušek Audiogramu; nové unit i E2E testy Výprav a Šatníku.

## 0.4.11 (22. 11. 2026)

- **Záloha a obnova dat (Více):** všechna data do jednoho souboru `drd2-zaloha-RRRR-MM-DD.json`: postavy, družiny, bytosti, předpisy, rozpracované úpravy a zdroje, volitelně ilustrace. Obnova „Doplnit“ nic nepřepíše, „Přepsat“ nahradí záznamy se stejným ID (s potvrzením). Soubor se při čtení očistí; cizí, poškozený nebo novější soubor se odmítne srozumitelnou hláškou. Balíčky pravidel se nezálohují.
- **`FORMAT.md`:** popis uložených dat, `schema` a migrací, přenosů a zálohy, pravidla změn formátu a historie. Každou změnu formátu zapisovat sem i do tohoto souboru.
- **Pod kapotou:** `core/backup.ts` (sestavení, čtení a obnova zálohy), `rawRecords` v `db.ts`, nápověda „?“ k záloze; nové unit testy a E2E zkouška zálohy.

## 0.4.10 (22. 11. 2026)

- **Průběžná kontrola postavy:** v úpravě postavy jsou povolání, na která postava nemá podmínky (pokročilá), v nabídce zašedlá s důvodem a nejdou přidat; tlačítko „+“ se zastaví na 5. úrovni. U schopností každého povolání je vidět „vybráno N z M“ a zvýrazní se, když jich je víc, než úroveň dovoluje. Kontrola postavy je i nahoře a označuje nové problémy.
- **Tvorba postavy:** kroky, které už jsou prošlé a něco v nich nesedí, mají v pruhu kroků značku ⚠ a nahoře je seznam s odkazy na opravu, ne až v Shrnutí.
- **Sdílet:** soubor se postavě i družině pojmenuje podle jména (`postava-brokan-rudovous.drd2.txt`, `druzina-sedi-vlci.drd2.txt`) i při Sdílet, dřív měl pevný název a v telefonu se nedal rozlišit.
- **Pod kapotou:** sdílené funkce `extraAbilities`, `professionUsage` a `shareFileName`; E2E zkoušky kontroly.

## 0.4.9 (22. 11. 2026)

- **Nápověda „?“:** tlačítko „?“ otevře pod prvkem krátké vysvětlení s kroky a odkazem do příručky (bez balíčku do SRD). Je u Hodu, Zdrojů, Surovin, Hotovosti, lektvarů, výrobků, nástrah, kouzel a Grimoáru, u Postupu postavy, Jizev, sezení, konfliktu, žurnálu družiny, sdílení postavy a družiny a importu, u Příručky, Rejstříku, Bestiáře, Nastavení, balíčků, zvuku a Aplikace i v jejich dialozích.
- **Stránka Nápověda (Více):** úvod do aplikace a všechna témata (návody, pravidla po ruce, složitější situace) s hledáním bez ohledu na diakritiku.
- **Pod kapotou:** karty postupu a nová témata jsou v jednom registru `core/help.ts` (dřív `guide.ts`), `CardHelp` je `ui/HelpPanel`, nové `HelpButton` a `HelpHeading`; test hlídá jedinečná ID i kotvy odkazů proti balíčku pravidel; E2E zkoušky nápovědy.

## 0.4.8 (22. 11. 2026)

- **Pod kapotou:** odstraněn nepoužívaný převodník SRD v prohlížeči (bookmarklet): `tools/srd/browser`, `vite.srd.config.ts`, `public/srd-import.user.js`, krok sestavení před `dev` a `build` a související test. Balíčky se dál staví Node nástroji.
- **Příručka po částech:** kapitoly Základní příručky jsou seskupené do čtyř sbalitelných částí podle SRD (Úvod do hry, Tvorba postav, Hraní hry, Vyprávění příběhů). Balíček má nepovinné `manifest.parts` a u kapitoly `part`; knihy bez částí zůstávají plochým seznamem. Číslo sestavení balíčků je 3, aplikace nabídne stažení nového balíčku.

## 0.4.7 (22. 11. 2026)

- **Družina: „změnil Průvodce“:** když hráč přijme novou kopii družiny a Průvodce mezitím změnil název nebo text schváleného zápisu, zápis má značku a tlačítko „Beru na vědomí“. Značka je jen místní informace, vlastní návrhy ji nemají.
- **Import revizí, konflikty:** u polí změněných na obou stranách se ukáže místní i příchozí hodnota a u každého pole se zvolí „Příchozí“ nebo „Ponechat moje“. Volba „moje“ se zapíše jako revize „Ponecháno moje (při importu)“, opakovaný import pak nic nenajde.
- **O aplikaci:** doplněn Workbox mezi použité knihovny; licence ověřeny proti nainstalovaným balíčkům.
- **Pod kapotou:** `withKeptMine` v `importFlow` s testy; příznak `changed` u zápisů žurnálu.

## 0.4.6 (21. 11. 2026)

- **Zkouška zvuku (Více):** jedna společná zkouška. Na jednom zařízení „Snímat a vyhodnotit“, na druhém „Přehrát test“: po 3 s se přehrají tóny a potom všechny přenosové režimy. Příjemce ukáže úrovně tónů, výsledky režimů a špičku vstupu a po vyhodnocení sám otevře Protokol zkoušek ke zkopírování. Nastavení zařízení je sbalené, tóny jsou každý na jednom řádku.
- **Pod kapotou:** společný signál a vyhodnocení tónů i režimů z jednoho záznamu (`fullTestSignal`, `toneLevels`) s testy.

## 0.4.5 (21. 11. 2026)

- **Název a popis předpisů:** název a popis jsou součástí identity předpisu u všech druhů. Lektvar má vlastní název a popis (starší lektvary si nechávají odvozený název), nástraha má popis. V Grimoáru je u názvu v závorce vlastnost (u lektvaru i Jizva), pod ním popis. Jiný popis nebo název znamená jiný předpis, stávající se potichu nemění.
- **Ukázkové předpisy:** 18 předpisů v Grimoáru (kouzla, lektvary, nástrahy, výrobky); obnoví se a odstraní spolu s ukázkovými postavami.
- **Sdílení od zvoleného bodu historie:** postavu lze sdílet od zvolené revize, družinu (Průvodce) od zvoleného zápisu žurnálu, vedle změn od posledního odeslání a celé historie.
- **Ilustrace postavy:** víc obrázků k postavě, uložených jen v zařízení; jdou uložit do souboru. Do souboru se sdílením se přikládají volitelně (kód, QR a zvuk je nenesou), import je přidá bez duplicit.
- **Více:** obsahové balíčky sloučené do jednoho seznamu (Pravidla a Bestiář vždy vidět se Stáhnout / Aktualizovat / Odebrat, pod nimi Načíst balíček); odstraněn vlastní převod ze SRD. Větší mezery mezi Zdroji.
- **Pod kapotou:** databáze verze 7 (úložiště ilustrací), jednotné zmenšení obrázků, E2E zkoušky ilustrací a sdílení.
## 0.4.4 (21. 11. 2026)

- **Oprava rozsypané lišty na mobilu:** výběr „Odkazy v textu“ v panelu u kapitoly pravidel a v Bestiáři rozšiřoval stránku za šířku displeje, takže spodní lišta byla oříznutá a při přiblížení „plavala“. Výběr zůstává jen ve Více; lišta kapitoly se zalamuje.

## 0.4.3 (21. 11. 2026)

- **Pod kapotou:** dokončen bod 7 revize kódu. Logika importu revizí, žurnálu a členů družiny a úpravy postavy je vyčleněná z panelů do samostatných funkcí s testy (`importFlow`, `journal`, `editor`). Chování se nemění, jen hláška po importu předpisů říká „Předpisy v Grimoáru“.

## 0.4.2 (21. 11. 2026)

- **Grimoár na liště:** samostatná stránka (📕) mezi Bestiářem a Více s filtrem podle druhu: kouzla, lektvary, nástrahy a výrobky. Nový předpis, úprava, nová varianta, smazání s výpisem postav, sdílení jednotlivě i celého Grimoáru.
- **Lektvary a nástrahy jako předpisy:** postava si je ukládá jako odkazy na předpisy v Grimoáru (počet Surovin či kusů a poznámka zůstávají u postavy). Stejný lektvar či nástraha u více postav je jeden předpis; úprava u postavy cizí předpis potichu nemění. Starší deníky se při prvním spuštění převedou (historie se přepíše), balíčky ze starší verze se převedou při importu.
- **Výrobky:** nový druh předpisu s počtem kusů u postavy.
- **Našeptávání:** při zadání nového lektvaru nebo nástrahy u postavy se nabízí předpisy z Grimoáru podle názvu (bez ohledu na diakritiku a velikost písmen).
- **Pod kapotou:** pracovní pohled postavy (rozbalení a zápis zpět do odkazů), převod starého formátu, E2E zkoušky Grimoáru a převodu deníku. Bod revize 7: ImportPanel, PartyView, Conflict a CharacterEditor zůstávají.

## 0.4.1 (21. 11. 2026)

- **Pod kapotou:** přechody manévrů, jejich plateb a iniciativy v panelu Hod jsou vyčleněné do samostatných funkcí s testy (chování se nemění); přibyla E2E zkouška manévrů. Zbývající body revize kódu: ImportPanel, PartyView, Conflict, CharacterEditor.

## 0.4.0 (21. 11. 2026)

- **Kouzla:** u postavy sekce Kouzla: seslání ad hoc (bez názvu a ukládání, jen cena a zkouška) nebo uložení kouzla jako předpisu; přidání z Grimoáru s našeptáváním podle názvu bez ohledu na diakritiku. Karta Postup pro kouzla.
- **Obory magie:** postava sesílá jen z oborů svých povolání (dovednosti Magie …, Zaříkání, Znamení, Hadačství); jiný obor jen záměrnou volbou Vlastní obor.
- **Grimoár:** ve Více seznam uložených kouzel (hledání, nové, úprava, nová varianta, smazání s výpisem postav). Postavy se na kouzlo odkazují, úprava se projeví u všech.
- **Sdílení kouzel:** kód i QR postavy nesou kouzla, na která odkazuje; Grimoár nebo jedno kouzlo jde sdílet i samostatně a vložit v Postavy → Import. Stejný obsah se nezdvojí, nic se nepřepisuje.
- **Pod kapotou:** nové úložiště předpisů (databáze verze 6), otisk obsahu předpisu, E2E zkoušky kouzel a Grimoáru.

## 0.3.19 (21. 11. 2026)

- **O aplikaci:** ve Více přibyla sekce O aplikaci: autor, licence, odkaz na zdrojový kód, poděkování (Altar, autoři SRD, Truhlice jako ideová inspirace, testeři) a použité knihovny.

## 0.3.18 (19. 11. 2026)

- **Dokumentace:** README a komentáře upřesňují, že Truhlice (Nogrim) je jen ideová inspirace, ne zdroj dat; případná shoda funkcí plyne z potřeb hraní Dračího doupěte 2. Do plánu přibyla stránka „O aplikaci“ s poděkováním (credits).
- **Pod kapotou:** průběžná kontrola větve `develop` (testy, typy, lint, E2E).

## 0.3.17 (19. 11. 2026)

- **Hod:** vyhodnocení zkoušky, výzvy a střetu je vyčleněné do samostatné funkce s testy (chování se nemění).
- **Seznamy:** postavy, vlastní bytosti, balíčky, kapitoly a družiny mají klíče, takže se při změně překreslují přesně.
- **Pod kapotou:** E2E zkouška hlavní cesty (stažení balíčků, tvorba postavy, hod, sdílení a import), typová kontrola nástrojů převodníku SRD, 372 testů.

## 0.3.16 (18. 11. 2026)

- **Oprava:** po stažení balíčků se pruh a Příručka správně překreslí hned (ve verzi 0.3.15 se obsah ukázal až po novém načtení stránky).
- **Balíčky ze SRD:** obrázky jsou v repozitáři zvlášť (zdrojový JSON s odkazy a soubory `.webp`), konečné balíčky se sestavují při sestavení aplikace. Pro uživatele se nic nemění, stahování je stejné.
- **Pod kapotou:** test reaktivity knihovny; 361 testů.

## 0.3.15 (18. 11. 2026)

- **Úložiště dat:** záznamy postav, družin a bytostí nesou číslo schématu a při změně formátu se migrují (databáze ve verzi 5, stávající data zůstávají). Aplikace používá jedno sdílené připojení k databázi a při aktualizaci v jiné kartě ji neblokuje.
- **Stahování balíčků:** hlídá zaseknutí (20 s bez dat), hlásí srozumitelné chyby (bez připojení, chyba serveru, stránka místo katalogu) a ukazuje průběh v procentech.
- **Pruhy nad navigací:** jeden pruh najednou podle priority (aplikace, zastaralé balíčky, novější balíčky, první stažení, instalace). U chybějících popisů už není tlačítko u každé položky, jen odkaz.
- **Příručka:** odkaz „V příručce“ na kartách Postup se ukáže jen tehdy, když kapitola existuje (dřív ho způsobil i balíček jen s Hrami mocných).
- **Převod ze SRD:** opravené hledání stránek v navigaci SRD v záložce (dřív se tiše používal pevný seznam).
- **Pod kapotou:** ESLint v CI, testy úložišť, stahování, směrovače a PWA (353 testů), jedno číslo sestavení balíčků a jedna adresa SRD v kódu.

## 0.3.14 (18. 11. 2026)

- **Stažení na místě:** při prvním spuštění online aplikace nabídne stažení Pravidel a Bestiáře (pruh s tlačítkem Stáhnout, volba Později se pamatuje). Nové verze balíčků se nabízejí jako Aktualizovat.
- **Tam, kde balíček chybí** (Příručka, Rejstřík, Bestiář, tvorba postavy, výbava, popisy ras a schopností, karty Postup) je místo „načtěte balíček“ a odkazu do SRD tlačítko **Stáhnout**. Odkaz do SRD zůstává jen jako záloha bez připojení.
- **Povahový rys** na postavě ukazuje popis z balíčku.
- **Více:** vlastní převod ze SRD je ve sbaleném oddílu „Pro pokročilé“ (pro soukromé balíčky). Aktualizované README a TODO.

## 0.3.13 (18. 11. 2026)

- **Balíčky ke stažení:** Základní příručka a Bestiář (v rozsahu SRD, s písemným svolením nakladatelství Altar pro nekomerční aplikaci) se stahují přímo z webu aplikace: Více, Obsahové balíčky, **Ke stažení**. Stahování ověřuje kontrolní součet a nabídne aktualizaci, když je balíček novější. Balíčky se aktualizují nezávisle na verzi aplikace. Soubor s balíčkem i převod ze SRD fungují dál (Hry mocných a další texty zůstávají jen soukromé).
- **Upozornění** na starší balíček teď nabízí stažení místo nového převodu.

## 0.3.12 (17. 11. 2026)

- **Hod:** tlačítko **Hodit** je přímo u kostek (místo políček s otazníky; „Zadat z kostek“ ukáže políčka pro fyzické kostky). Po hodu je na 2 sekundy zablokované proti omylem opakovanému hodu.
- **Paměť sekcí:** záložky (Postava, Družina, Příručka, Bestiář, Více) vedou na poslední otevřenou stránku a vrací i místo, kde jste skončili (posun). Klepnutí na aktivní záložku vede na seznam sekce. Nová stránka se otevře nahoře. Paměť přežije zavření aplikace.
- **Jizvy:** **Zahojit** (dříve Zahojeno) nejdřív ukáže popis Jizvy a nechá potvrdit nebo zrušit.
- **Balíčky:** aplikace pozná balíček ze SRD ve starší podobě (číslo sestavení) a vyzve k novému převodu a načtení (pruh nad navigací a poznámka ve Více). Po této aktualizaci je potřeba balíčky Pravidla a Bestiář převést znovu.

## 0.3.11 (17. 11. 2026)

- **Příručka:** nový rozcestník nahoře. Vedle Rejstříku je tlačítko pro každou další načtenou knihu (Bestiář, Hry mocných), které posune stránku na nadpis její sekce. Základní pravidla jsou hned nahoře, tlačítko nemají. Tlačítko Bestiář už neotevírá modul Bestiáře (ten zůstává na záložce Bestiář a v kapitolách druhů).

## 0.3.10 (17. 11. 2026)

- **Příručka:** balíček, který přináší jen povolání bez kapitol (např. **Hry mocných** s mistrovskými povoláními), má v Příručce vlastní sekci. Povolání otevřete klepnutím: úvod, dovednosti a schopnosti.

## 0.3.9 (17. 11. 2026)

- **Ohrožení** se v panelu Hod bere vždy z trackeru: výchozí 2, rozsah 1 až 99, pole s ± (číslo lze i napsat). Stejné ovládání má Výhoda. Cena vyčerpání je rovna Ohrožení. **Konec konfliktu** vrátí Ohrožení na 2 a Výhodu na 0.
- **Výroba a nástrahy → panel Hod:** u výroby „Na výpravě“ tlačítko **Hodit zkoušku v panelu Hod** (dialog se skryje, rozepsané hodnoty zůstanou, vrátíte se tlačítkem Pokračovat ve výrobě); **Použít** nástrahu předvyplní výzvu. Ohrožení zůstává podle trackeru.
- **Postup vyhodnocení:** karty Léčení, Výroba a Nástrahy ukazují související dovednosti (názvy z balíčku, bez balíčku odkaz do SRD).
- **Léčení Jizvy:** v dialogu je nápověda „?“ (postup, dovednosti, odkaz do příručky nebo SRD).

## 0.3.8 (17. 11. 2026)

- **Knihy a kapitoly:** Příručka ukazuje knihy a pod nimi kapitoly; Předchozí a Další listuje v rámci jedné knihy.
- **Bestiář (kniha):** kapitoly Bytosti v příbězích, Jak bytosti číst, hrát a tvořit a pět druhů bytostí s vlastními úvody (dřív chyběly). U úvodu druhu je tlačítko na jeho bytosti v Bestiáři.
- **Bytosti ze Základních pravidel** (43 bytostí z kapitoly Bestiář) jsou v Bestiáři spolu s bytostmi z Bestiáře.
- **Bestiář (seznam):** filtr prostředí (ikony, výběr více najednou, prázdný čtvereček = bez uvedeného prostředí) a řazení abecedně nebo podle druhů.
- **Hledání v knihách:** fulltext přes kapitoly (po oddílech), bytosti a pojmy, bez diakritiky, s úryvky a skokem na oddíl.
- **Rejstřík** pojmů: začátky knih, abecední seznam, další místa u pojmů v závorce (doplňují se ručně v `src/data/index-extra.json`).
- Po aktualizaci je potřeba balíčky postavit znovu (`node tools/srd/build.mjs` a `node tools/srd/build-bestiar.mjs`) a načíst ve Více.

## 0.3.7 (17. 11. 2026)

- Oprava: nadpis „Prastaří a“ v Bestiáři ukáže ikonu (lebka s korunou) místo písmene.

## 0.3.6 (17. 11. 2026)

- Bestiář a Příručka: místo písmen z písma knih (Lesy b, Pláně c, …) se ukazují **ikony prostředí** (strom, tráva, hory, vlny, klas, chaloupka, zřícená věž) v nadpisech kapitol i u bytostí. Značka „a“ je **prastará bytost** (lebka s korunou).

## 0.3.5 (16. 11. 2026)

- Postava: **Nástrahy** (pasti, třaskaviny, jedy). Připravené nástrahy se evidují ve stylu pravidel („Jáma s kůly (Jednoduchá past > Tělo, mocně / Vyřazení; slabina: …)“): název, druh, cílová vlastnost, zamýšlený účinek (Ohrožení, Jizva, Vyřazení), vložený manévr, další vlastnosti, slabina a počet kusů. Počet se mění ±, **Použít** ubere kus (poslední kus zmizí) a zapíše revizi. Každá nástraha je samostatná změna v deníku revizí a přenáší se při sdílení (pole `traps`, jen přidání).
- **Kalkulátor ceny** v Surovinách podle pravidel: základ 3, +1 vyřazení, +1 manévr, +1 pokročilý druh, +1 za každou další vlastnost; rozpis ceny je vidět v dialogu.
- Výroba a opravy: nový druh **Nástraha** (cena kusu krát počet kusů, odečet Surovin po druzích, při úspěchu se nástraha zapíše).
- Postup vyhodnocení: karta Nástrahy.

## 0.3.4 (16. 11. 2026)

- Postava: **Lektvary a masti** (stručná evidence): na co jsou (vlastnost a druh Jizvy), kolik Surovin v nich je (±), poznámka (např. do slunovratu); přidat a upravit přes dialog. Každý lektvar je samostatná změna v deníku revizí a přenáší se při sdílení (pole `potions`, jen přidání).
- Léčení Jizvy: nabídne **vlastní lektvary** shodné vlastnosti (Suroviny z nich se po uložení odečtou, vyčerpaný lektvar zmizí) a zvlášť „Cizí lektvar nebo mast“ pro lektvar mimo evidenci.
- Výroba: nový druh **Lektvar** (vlastnost, druh Jizvy, počet vložených Surovin). Při úspěchu se lektvar zapíše do evidence.
- Zahrnuje vše od 0.3.2: Výroba a opravy (0.3.3) a oprava duplicitní nabídky nové verze ve Více.

## 0.3.3 (16. 11. 2026)

- Postava: **Výroba a opravy…** (tlačítko pod Surovinami). Druh (výroba, oprava, nouzový předmět), název, cena předmětu v groších (návrh: Surovin zhruba polovina, oprava 5 za stupeň závažnosti; cena jde přepsat) a **odečet Surovin po druzích** (nabídne se výchozí rozdělení: nejdřív bez druhu, pak druhy). Mezi výpravami bez hodu, na výpravě se zapíše výsledek (podařilo se / nepodařilo, Suroviny propadly / přerušeno, nic se nespotřebuje). Vyrobený předmět se může přidat do výbavy; nouzový je zdarma a označený. Zapíše se jedna revize.
- Postup vyhodnocení: karta Výroba a opravy.
- Více, Aplikace: nabídka „Je připravená nová verze [Načíst]“ se neopakuje, dokud je dole lišta s novou verzí; ukáže se tam až po „Později“. Starý text „Nová verze je připravená“ po kontrole zmizel.

## 0.3.2 (16. 11. 2026)

- Postava: **Hotovost** se ukládá a ovládá jako **tři samostatné hodnoty** (dukáty, groše, haléře), každá s ±. Nic se samo nepřevádí do vyššího řádu (haléřů může být i víc než 9). Při čerpání pod nulu se rozmění jedna mince shora (groš na 10 haléřů, dukát na 10 grošů); rozměnění dukátu se zeptá. Rychlá klepání se sloučí do jedné revize („Hotovost: 1 dukát → 9 grošů 9 haléřů“). V editoru postavy jsou tři pole.
- **Změna formátu dat (pole `cash`)**: z čísla v haléřích na objekt `{dukaty, grose, halere}`; v deníku revizí cesty `cash.dukaty`, `cash.grose`, `cash.halere`. Starší záznamy s číslem (v deníku, přenosu, konceptech) se načtou a převedou na nejkratší zápis. Ukázková data jsou upravená.

## 0.3.1 (16. 11. 2026)

- Postava: tlačítko **Zmírnit** u Jizvy (dřív „Zmírnit o 1“) otevře dialog léčení: Jizva je rovnou o 1 nižší, jde upravit její **popis** a závažnost (nejníž na 1, nejvýš o 1 méně než dosud; úplné odstranění je „Zahojeno“). Ukáže celkové snížení (k porovnání se silou magického okamžiku) a cenu 5 Zdrojů za stupeň. **Zdroje z lektvaru** nebo masti (nejvýš cena) se odečtou a zbytek si hráč rozdělí mezi Tělo, Duše a Vliv (nabídne se výchozí rozdělení, jde upravit). Výhodou ani dočasnými Zdroji z jizvy se neplatí. Uložit zapíše jednu revizi (nová závažnost a popis) a čerpání Zdrojů; Zrušit nic nezmění.
- Postup vyhodnocení: karta Léčení Jizvy.

## 0.3.0 (16. 11. 2026)

- Postava: **Suroviny** v přehledu (řádek `✎ Suroviny − ## +`). Volitelně **druhy** (značka 1 až 2 znaky, i emotikona, a název; ✎ otevře dialog): přehled pak ukazuje součet a řádek za každý druh s ±. Druh s nenulovým počtem nejde smazat. Rychlá klepání se zapíšou jako jedna revize.
- Druhy a počty jsou v deníku revizí a přenášejí se při sdílení postavy (každý druh je samostatná cesta, takže se úpravy různých druhů nepřebíjejí). Formát: jen přidání polí `rawMaterials` a `rawMaterialKinds`; starší postavy bez nich mají 0 a žádné druhy.
- `PLAN-POMUCKY.md`: krok 11a hotový, zásady migrace dat.

## 0.2.7 (16. 11. 2026)

- Audiogram: **zrychlování za běhu**. Když dávka dat projde celá, odesílatel zkusí malou dávkou nejbližší rychlejší režim; při nezdaru se vrátí a ten režim už nezkouší. Automatický výběr z handshake byl opatrný (skutečný kanál unese víc).
- Audiogram: kratší čekání na konec vysílání (0,35 s) ve smyčce vysílač/příjemce, tedy menší ztráta v každém kole.
- Více: Zkouška režimů ukazuje špičku vstupu a varuje při přebuzení (ořez kazí rychlé režimy).

## 0.2.6 (16. 11. 2026)

- Audiogram: odesílatel po každé dávce poslouchá až do odpovědi (ne jen pevné okno), protože pomalejší telefon potvrzení vyhodnocuje a odesílá se zpožděním. Příjemce čeká na konec vysílání 0,6 s.
- Audiogram: kopírovatelný **protokol** přenosu (časy, úrovně zvuku, doba vyhodnocení, počty rámců, režim, odstup, nastavení mikrofonu) při vysílání i příjmu.
- Více: **Zkouška režimů** (vysílač pošle zkušební rámce ve všech režimech, příjemce ukáže, které prošly) a kopírovatelný protokol zkoušek.
- Audiogram: ukazatel hlasitosti je vidět i při vysílání.

## 0.2.5 (16. 11. 2026)

- Audiogram: ukazatel hlasitosti vstupu při vysílání i příjmu („slabé“ / „v pořádku“ / „přebuzené“), aby bylo hned vidět, jestli mikrofon vůbec něco slyší.
- Zkouška zvuku: rady k nastavení zařízení před přenosem (vypnout vylepšování zvuku, hlasitost vstupu a výstupu, vzdálenost).
- `AUDIOGRAM.md`: srovnání s HF modemy (Data2G, vardeFM, Aether HF, Ion HF, xara). Přenos samotný beze změny.

## 0.2.4 (15. 11. 2026)

- Potvrzení (smazat, odebrat, zahodit, vrátit změnu, obnovit a odstranit ukázková data …) je dialog ve stylu aplikace, celý česky, místo systémového okna prohlížeče. Esc nebo klepnutí mimo dialog je Zrušit.
- „Radiogram“ se jmenuje **audiogram** (přenos kódu zvukem). Stejná funkce, nový název v aplikaci, kódu a dokumentaci (`AUDIOGRAM.md`).
- Více: **Zkouška zvuku**. Jedno zařízení přehraje řadu tónů (500 Hz až 8 kHz), druhé ukáže úroveň každého, hlasitost vstupu, vzorkování a zda je potlačení ozvěny, šumu a automatická hlasitost opravdu vypnutá. Pomáhá zjistit, proč se přenos zvukem mezi zařízeními nedaří.
- Audiogram: analýza využitého pásma (všechny režimy jsou v hovorovém až středním pásmu, handshake v 1 až 2,3 kHz) a srovnání s HF modemy je v `AUDIOGRAM.md`. Samotný přenos beze změny.

## 0.2.3 (15. 11. 2026)

- Ukázková data ve Více: tlačítka „Obnovit“ a „Odstranit“. Odstranění smaže jedním krokem všechna ukázková data (postavy, družinu i rozpracovaný konflikt) a nic jiného; po něm se ukázková data už sama nenabízejí.

## 0.2.2 (14. 11. 2026)

**Ukázková data**
- Tři ukázkové postavy (Brokan Rudovous, Lístek Podhorní, Eliška z Mlžných hájů) a ukázková družina. Nainstalují se při prvním spuštění do prázdné aplikace, dají se upravit i smazat a ve Více je tlačítko „Obnovit ukázková data“.

**Konflikt**
- Tracker konfliktu: příprava (iniciativy a pořadí, šipky ↑↓ jen mezi shodnými hodnotami, současné akce) a průběh kol (stav Čeká / Jednal / Odložil / Vyřazen jedním tlačítkem, Ohrožení v řádku, „Na řadě“, akce prostředí, Další kolo, Konec konfliktu).
- Společná Sudba bytostí (základ podle nejsilnější bytosti, ostatní po 1, upravitelná) a dialog účastníka s hodem bytosti, Ohrožením a Jizvami.

**Hody**
- Iniciativa s přístupem rychle / pomalu (3k6, dvě nejvyšší / nejnižší; stojí 1 Duši, bytost 1 Sudbu, cena se strhne automaticky).
- Postih „nepřesně“ vedle manévru přesně, výpis všech hozených kostek.
- Panel „Postup vyhodnocení“: heslovité kroky zkoušky, střetu, výzvy, kola konfliktu a složitějších situací s odkazy do příručky.

## 0.2.1 (14. 11. 2026)

- Opravy: typ v radiogramu (kontrola typů v CI), mistrovská povolání z balíčku Hry mocných se dají načíst (validace bez dovedností) a v Postupu se zatím nenabízejí.
- Beze změny funkcí oproti 0.2.0; balíček Her mocných zůstává jen lokální (nedistribuuje se).

## 0.2.0 (14. 11. 2026)

**Navigace a stránky**
- Pět záložek: Postava, Družina, Příručka, Bestiář, Více. „Nová postava“ je v Postavách, Více má balíčky, převod SRD podle zařízení, nastavení a Aplikaci.
- Úklid stránek (akce nahoře, sbalené vedlejší bloky, smazání vždy s potvrzením), kratší tlačítka a výrazné šipky.
- Příručka: hledání kapitol, předchozí / další kapitola.

**Postava**
- Zdroje: klepnutí na číslo nebo políčka otevře dialog Jizva (vlastní zasazení dává závažnost + 2 dočasné Zdroje, ty se ukazují čárkovaně).
- Panel Hod: 2k6 + úroveň povolání, zkouška, výzva a střet, vyčerpání, Ohrožení, Výhoda, manévry (přesně, mocně, lstivě, rozsáhle, obrana).
- Tvorba: výběr rasy klepnutím, výbava bez balíčku (sady Obyčejná / Ceněná / Drahá), generátor jmen.

**Družina**
- Konflikt: iniciativa, kola, Ohrožení, Výhody, vyřazení, shrnutí do žurnálu; bytosti z Bestiáře do konfliktu (Sudba, hranice, Jizvy).

**Přenos**
- Radiogram (experimentální): přenos kódu zvukem, handshake, oprava chyb Reed–Solomon, binární kód, AFSK / PSK / QAM / OFDM, ruční volba režimu. Neověřeno na skutečných telefonech.

## 0.1.0

První verze: postavy jako deník změn, tvorba postavy, sdílení kódem / souborem / QR, družiny, Bestiář, Příručka z lokálního balíčku, offline PWA.
