# Změny

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
