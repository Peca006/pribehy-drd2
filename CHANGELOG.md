# Změny

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
