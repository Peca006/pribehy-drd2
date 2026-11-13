# Nápady a dolaďování

## Otevřené úkoly (stav k 13. 11. 2026)

**Nasazeno (main = develop):** pět záložek, dialog Jizva ze Zdrojů, dočasné Zdroje z jizvy, výběr rasy klepnutím, kratší
tlačítka a šipky, **výbava bez balíčku** (sady Obyčejná / Ceněná / Drahá vloží holý výčet položek, jen když nepřepíše vlastní
text; ceník odkazem do SRD; v kostře jsou jen krátké názvy položek) a **generátor jmen** (markovský, z příkladů jmen rasy
v balíčku, tlačítko v kroku Shrnutí; bez balíčku nic nenabízí).

**Větev `radiogram` (pushnutá, nesloučená, mimo vydávanou aplikaci):** zvukový přenos kódu. Hotové jádro AFSK 300/600/1200,
rámce s CRC, handshake (CALL / READY podle změřeného odstupu signálu), dávky s ACK a opakováním, Web Audio vrstva a tlačítka
Vysílat / Přijímat zvukem; testy se simulovaným kanálem. **Nedodělané:** skutečný zvuk mezi telefony nezkoušen (ladit
hlasitost, předzvuk, odstup), PSK / QAM / OFDM nejsou (jen AFSK; rozhraní režimů je připravené), chybí oprava chyb (FEC).
Podrobně v `RADIOGRAM.md` ve větvi. Další krok: zkouška na dvou telefonech, potom PSK a OFDM.

**Přenosy (pořadí):** ruční slučování konfliktů při importu revizí postavy → Wi-Fi / WebRTC → QR na celou obrazovku a tisk
(hlavně počítač) → NFC (čtení a zápis tagů, jen Chrome na Androidu; úplně nakonec).

**Postava:** Suroviny (viz níže), Povolání z Her mocných a mistrovská povolání (čeká na odpověď z Altaru), dovednosti bez balíčku
jako odkaz do SRD (po odpovědi o textech pravidel).

**Čeká na jiné:** Altar (texty pravidel), d20.cz (CORS pro SRD).

**K ověření na telefonu:** share target, cyklus aktualizace PWA, QR díl 500 znaků na A52s, převodník SRD v Chromu, nové Zdroje a
dialog Jizva na skutečném displeji.

**Další milník: Výpravy.** Sekce pro vypravěče s podklady pro tažení, výpravy a dobrodružství (aplikace je pro uživatele, který
je Průvodcem i hráčem: spravuje postavy jako hráč a družiny jako vypravěč). Dořešit obsah a vazbu na družiny a žurnál.

### Suroviny (vysvětlení a návrh)

Podle pravidel (Používání dovedností: Výroba, Opravy, Suroviny, Kořist) jsou **Suroviny** druhá „měna“ vedle Peněz: vzácnější
materiál pro výrobu a opravy (oleje, byliny, kouzelné přísady, čepy, hřebíky, proužky kůže), který nejde sehnat kdekoliv. Hráč
si v deníku vede jen **celkový počet** Surovin, při použití škrtne tolik, kolik výroba nebo oprava stojí; mezi výpravami se
Suroviny používají spolu s Penězi. Oprava a léčení Jizev na Poutu stojí 5 Zdrojů za stupeň závažnosti, placených Surovinami;
řemeslník bere Peníze. Kořist (včetně surovin) se nachází nebo získává zpracováním bytostí. Volitelně „příběhová podoba“:
seznam drobností s cenou v groších.
Návrh pro aplikaci: počítadlo Surovin u postavy (vedle hotovosti, v deníku revizí), tlačítka ±, odečtení při výrobě nebo opravě;
až později pomůcka k výrobě a opravám (cena podle pravidel) a volitelný seznam drobností.

### Rozdíl: slučování konfliktů, „změněno Průvodcem“ a „slučování zápisů“

- **Ruční slučování konfliktů při importu revizí (přenosy, postavy)**: postava má strukturovaný deník revizí; když se dvě
  větve historie změní na týchž polích (např. hráč i vypravěč upravili zdatnost), import dnes konflikt jen ohlásí. Zbývá
  nabídnout u každého konfliktního pole volbu „moje / jejich“ a sloučit zbytek. Je to jediné skutečné slučování, které
  zůstává.
- **Slučování souběžných úprav jednoho zápisu (družina)**: prakticky odpadá. Schválené zápisy mění jen Průvodce (hráči jen
  navrhují nové), takže dva lidé jeden zápis souběžně neupraví. Z TODO se vyřazuje.
- **Upozornění „Průvodce změnil zápis“**: jen informace, žádné slučování: když přijde nová kopie družiny, zápisy, které se
  proti hráčově kopii změnily, dostanou značku. Malá úprava, nezávislá na slučování.

### Zdroje ze sebezasazené jizvy (hotovo)

Zdroje (závažnost + 2) se po zasazení ukážou u příslušné vlastnosti jako čárkovaná políčka a „+N“; čerpají se jako první;
„Zahodit“ nebo „Obnovit“ je zruší (nespotřebované propadají, kolo aplikace nesleduje). Uloženo jen v zařízení (`play.ts`).

## Plán: hody a řešení střetů, výzev a zkoušek (podle SRD)

Pravidla (kap. Základní pravidla, Složitější situace, Používání dovedností): hod = 2k6 + úroveň povolání použité dovednosti
(bez povolání 0, při více povoláních v jedné akci nejnižší úroveň, bytosti charakteristika); úspěch ve zkoušce a výzvě při hodu
9 a více, ve střetu vyšší hod (shoda: aktér, pak vyšší kostka, pak vyšší součet, pak los). Neúspěch lze zmírnit **vyčerpáním**
(škrtnout Zdroje podle Ohrožení, nejméně 1, Ohrožení se zvýší o 1) nebo přijmout. Zkouška (proti prostředí nebo nebránícímu se
protivníkovi), výzva (akce prostředí, následná akce, nástraha; vyčerpání jen zmírňuje) a střet (protiakce aktér × protiaktér;
vyčerpání změní plný úspěch vítěze v částečný). Následky: Ohrožení ±1, Jizva (závažnost 1, víc manévrem), Výhoda. Manévry:
obrana, rozsáhle, přesně, mocně, lstivě (platí se při použití, nesčítají se). Konflikt: iniciativa, kola, vyřazení, hrdinská smrt.

Postup v krocích (každý krok použitelný sám; pomůcky nahrazují papír a kostky, nerozhodují za hráče):

1. **Hod**: tlačítko Hodit (2k6) i ruční zadání fyzických kostek; k hodu se přičte úroveň povolání zvolené z postavy (výběr
   povolání nebo dovednosti, pravidlo nejnižší úrovně při více povoláních, 0 bez povolání); ukáže součet a „9 a více“.
   Bez postavy jen úroveň zadaná ručně (pro Průvodce a bytosti).
2. **Ohrožení**: počítadlo u postavy nebo účastníka (jen ve hře, ne v deníku revizí), úprava ±1, připomenutí „vyčerpání
   vždy aspoň 1 Zdroj a Ohrožení +1“.
3. **Zkouška (průvodce krokem)**: záměr a hrozící neúspěch (poznámka), hod, výsledek; při neúspěchu volba vyčerpat nebo přijmout:
   vyčerpání škrtne Zdroje (napojení na `Resources`) podle Ohrožení a zvýší Ohrožení; při úspěchu volitelné následky
   (Ohrožení −1, Výhoda, Jizva).
4. **Výzva**: totéž s rozdíly (bez reakce nastane následek hned; úspěch jen odvrátí nebezpečí; vyčerpání jen zmírní).
5. **Střet dvou účastníků**: aktér a protiaktér, dva hody, vítěz podle pravidel o shodě, poražený popisuje vyčerpání
   (částečný úspěch vítěze); kontrola tří podmínek protiakce jako nápověda.
6. **Následky a Výhody**: evidence Výhod a Ohrožení, Jizva z rozhodnutí hráče nebo jako následek (dialog Jizva už je);
   Jizvy z nepřátelské akce rovnou jako revize deníku.
7. **Manévry**: seznam (obrana, rozsáhle, přesně, mocně, lstivě) s cenou, platba až při použití, kontrola „nesčítají se“,
   vliv na Zdroje; popisy jen z balíčku pravidel (bez balíčku název a odkaz do SRD).
8. **Konflikt (pomůcka vypravěče)**: účastníci (postavy z družiny, bytosti z Bestiáře), iniciativa (podle příběhu nebo hodem
   bez dovednosti, přístupy, odložení), pořadí a počítadlo kol, Ohrožení a Zdroje účastníků, vyřazení a opuštění boje;
   uloženo u družiny nebo sezení, shrnutí se zapíše do žurnálu.
9. **Bytosti v konfliktu**: Sudba a hranice bytostí (charakteristika jako úroveň, Jizvy bytostí jen jako náročnost a součet
   proti hranici), tlačítka přímo v kartě bytosti z Bestiáře.
10. **Složitější situace**: zkouška více postav nebo cílů, spolupráce, přípravné akce, ukrývání a odhalování, následné akce
    a akce prostředí, hrstka a houf; nejdřív jen nápověda s odkazem do příručky, potom pomůcky.
11. **Navazující pomůcky**: výroba a opravy (Suroviny), léčení Jizev, kouzla a nástrahy (cena Zdrojů), kořist a trofeje.

**Hotovo:** kroky 1 až 3 (zkouška s vyčerpáním: volba vlastnosti, cena = Ohrožení nejméně 1, zvýšení Ohrožení, nabídka zjizvení při nedostatku Zdrojů; stav čerpání se sdílí mezi panely Zdroje a Hod; panel Hod na detailu postavy: výběr povolání, 2k6 hozené nebo zadané z fyzických kostek, hod a
úspěch od 9, počítadlo Ohrožení; `core/character/roll.ts`, `play.ts`). Hotové jsou i krok 4 (výzva) a krok 6 (Výhoda jako „žolíkový“ Zdroj, platí se první; Ohrožení +1 při přijetí neúspěchu; konec konfliktu zruší Ohrožení i Výhodu). Zatím chybí následky úspěchu kromě Ohrožení −1 (Výhody jsou krok 6) a zápis do žurnálu.

Pořadí realizace: 1, 2, 3, 4, 6, 5, 7, 8, 9, ostatní podle potřeby. Rozhodnout předem: zda hody žijí jen ve hře (zařízení),
nebo se zapisují do žurnálu; jak vypadá pomůcka u stolu (jedna obrazovka „Hra“ s postavou, Ohrožením a hodem).

## Rejstřík pojmů: počet odkazů (hotovo)

Odkazy z pojmů (`***pojem***`) se omezují při zobrazení (`src/core/termLinks.ts`, značka `NO_LINK` v `parseInline`),
v kapitolách i u karet bytostí. Nastavení „Odkazy v textu“ (`src/core/settings.svelte.ts`, uloženo v localStorage):
jen první výskyt (výchozí) · první a po 5000 znacích textu · všechny · žádné. Pojem vysvětlený v téže kapitole
se odkazuje jen před místem vysvětlení.

## Mapy a obrázky v balíčku (hotovo)

Obrázky ze SRD (4 ks) se při sestavení balíčku převedou na WebP a vloží do JSONu jako `data:image/webp`
(`tools/srd/images.mjs`, zdrojové PNG se stahují do `reference/srd/assets/`). Čtečka je zobrazí s možností
přiblížení (`src/ui/ZoomImage.svelte`). Možné vylepšení: ukládat obrázky z balíčku do IndexedDB jako soubory,
pokud by velikost JSONu v paměti vadila.

## Import ze SRD přímo v zařízení uživatele (bookmarklet, první verze hotova)

Web SRD nemá hlavičky CORS (a nevysílá ani CSP, ověřeno), proto převod běží jako **bookmarklet** na stránce
`drd2srd.d20.cz`: záložka načte skript `srd-import.js` z Pages, ten stáhne stránky (stejná doména), převede je a nabídne
dva soubory `.json` ke stažení (pravidla, bestiář). Text se nehostuje, skript obsahuje jen kód převodníku.

- `tools/srd/pipeline.mjs`: čisté funkce nad řetězci HTML (společné pro Node i prohlížeč); `build.mjs` a
  `build-bestiar.mjs` jsou jen tenké obálky (výstup ověřen: shodný kontrolní součet s původním).
- `tools/srd/browser/entry.mjs`: stažení stránek, obrázky přes canvas na WebP, okno s průběhem a odkazy ke stažení;
  `vite.srd.config.ts` ho sestaví do `public/srd-import.js` (gitignorováno, běží před `dev` a `build`).
- Návod a odkaz záložky: Knihovna → Převod SRD z webu (`SrdImport.svelte`).
- **Ověřit po nasazení:** celý běh na živém SRD (z localhostu ho prohlížeč zablokuje), počet povolání (15), bytostí (117),
  obrázků (4), a že balíčky z bookmarkletu jsou shodné s Node verzí.
- Mobil: iOS Safari a Firefox pro Android bookmarklety zvládají, Chrome pro Android ne spolehlivě (v návodu je
  odkaz ke zkopírování). Alternativa: balíček sestavit na počítači a soubor přenést.

## Historie, návrhy a sdílení postav

Hotovo (lokálně): deník změn je seskupený do **revizí** (`src/core/character/revisions.ts`), historie ukazuje
„před → po“ a umí **Vrátit tuto změnu** (přidá novou revizi, nic se nemaže). Úprava postavy probíhá na
**návrhu** uloženém v zařízení (`drafts.ts`), do deníku se zapíše až **Zveřejnit** jako jedna revize s povinným
popisem a podpisem (nastavení `author`).

Další krok: **sdílení revizí** s vypravěčem. Rozhodnutí: autoritou je deník vypravěče; hráč posílá návrh změny
(revizi), vypravěč vidí rozdíl a **Přijme / Zamítne**. U hráče by revize byla ve stavu „čeká na schválení“, dokud
nepřijde potvrzení (nebo import vypravěčova deníku). Revize obsahuje jen změněné cesty a nové hodnoty
(odhad 100–500 B), stará hodnota se neposílá a odvodí se z deníku příjemce; je potřeba odkaz na revizi, na kterou
navazuje (detekce rozdílného základu, slučování nepřekrývajících se změn).

Způsoby přenosu (koncept, pořadí se ještě určí):

- **Kód / soubor / QR.** Stlačený JSON (deflate + base64url). QR se spolehlivě čte do cca 1–1,5 kB, větší
  data na více QR nebo souborem. Funguje všude a offline.
- **NFC.** Web NFC (`NDEFReader`) je jen v Chrome na Androidu, iOS ho pro weby nemá. Vhodné pro krátké revize.
- **Bluetooth.** Web Bluetooth neumí běžný přenos souborů mezi telefony, takže jen jako výjimka. Spíše přes
  systémové sdílení.
- **Wi-Fi / lokální síť.** Bez serveru jen přes WebRTC (výměna signalizace kódem/QR, pak přímé spojení v téže
  Wi-Fi). Složitější, ale umožní větší data a oboustrannou synchronizaci.
- **AirDrop (iOS/macOS) a Quick Share / Nearby Share (Android).** Přes systémové sdílení: Web Share API
  (`navigator.share` se souborem `.json`) zobrazí systémový dialog, kde je AirDrop, resp. Quick Share. Nejpohodlnější
  pro uživatele a téměř bez práce navíc; příjemce soubor otevře v aplikaci (zaregistrovat typ souboru /
  `file_handlers` v manifestu PWA, na iOS import přes tlačítko).
- Příjem souboru z jiných aplikací: `share_target` v manifestu PWA (Android).

### Zhuštění historie pro QR

Když se revize s historií nevejdou do QR (cíl cca 1,2 kB po stlačení, rozumný limit 1–1,5 kB), starší revize
od začátku se při **exportu** sloučí do jedné výchozí revize „stav k revizi N“ (`eventsFor(prázdná, stav v čase N)`)
a navazují na ni novější revize. N = nejmenší, při kterém se kód vejde.

- Jen pro přenos; místní deník zůstává celý (nevratné zhuštění přímo v deníku jen jako zvláštní volba).
- Výchozí revize nese otisk (hash) stavu v čase N: příjemce s plnou historií porovná otisk se svým stavem;
  při shodě přijme navazující revize, při neshodě upozorní na rozdílný základ. Příjemce bez historie vezme
  výchozí revizi jako počátek.
- Před zhuštěním lze zkusit vynechat velké texty (příběh, poznámky) nebo rozdělit data na více QR / soubor.
- Změřit skutečnou velikost typických postav a revizí, než se zvolí limit.

## Vestavěný přehled a kontrola postavy (hotovo)

`src/data/skeleton.json` (generuje `tools/srd/build-skeleton.mjs`) obsahuje jen názvy, ID, vlastnosti a čísla
pravidel tvorby; aplikace s ním funguje bez balíčků a nainstalovaný balíček jeho položky přepisuje podle ID.
`src/core/character/check.ts` kontroluje postavu (neznámá ID, počet schopností na úrovni, rasové schopnosti,
kultura, rozsah úrovně, duplicity, hotovost); varuje, ale neblokuje. Zobrazuje se na detailu postavy a
v editoru. Možné rozšíření: kontrola stavu po každé příchozí revizi při schvalování vypravěčem.
Výbava bez balíčku: viz větev `vybava-bez-balicku` nahoře.

## Sdílení revizí (první verze hotovo)

Hráč: Postava → **Sdílet…** (`SharePanel`): kód `DRD2:` (stlačený JSON), soubor nebo systémové sdílení; posílají se
změny od posledního odeslání, nebo celá postava (nová postava asi 450 znaků, revize s několika změnami asi 400).
Vypravěč: Postavy → **Import…** (`ImportPanel`): náhled „před → po“ po revizích, detekce navázání / rozdílného
stavu / neznámého základu a konfliktů, **Přijmout** (zaškrtnuté) nebo zamítnout, volitelně kód **odpovědi**
hráči (přijato / zamítnuto + poznámka). Hráč odpověď naimportuje: revize dostanou štítek (odesláno / přijato /
zamítnuto) a zamítnuté změny lze jedním tlačítkem vrátit. Jádro: `core/character/share.ts` (balíček, očištění,
analýza), `reviews.ts` (stav revizí). Přijaté revize se do deníku vypravěče přidají beze změny ID.

Zbývá: ruční slučování konfliktů, Wi-Fi/WebRTC, `file_handlers` (jen počítač), nakonec NFC. (Kontrola každé příchozí revize v importu je hotová.) (QR, zhuštění historie a `share_target` jsou hotové.)

## QR a kontrola při importu (hotovo)

Kód `DRD2:` se zobrazí jako QR (`qrcode-generator`, `src/ui/QrView.svelte`); delší kód se rozdělí na díly
`DRD2Q:id.i.n.…` (700 znaků na QR), která se střídají a čtečka je složí (`core/character/qr.ts`). Čtečka
kamerou (`jsqr`, `src/ui/QrScanner.svelte`) je v Importu; potřebuje https nebo localhost a povolení kamery.
Ověřeno v prohlížeči na vykresleném QR (4 díly, 2,7 kB kódu se složily shodně); čtení skutečnou kamerou a
na telefonu zatím nezkoušeno. Import ukazuje kontrolu postavy po přijetí zaškrtnutých revizí a označuje nové
problémy proti současnému stavu.

Čtení kamerou je ověřeno na telefonu (díly 500 znaků). Zbývá: NFC, Wi-Fi/WebRTC, `file_handlers`.

## Zhuštění historie pro QR (hotovo)

Na obrazovce Sdílet lze u QR zapnout „Zhustit starší historii, aby se vešla do 1/2/3 QR“ (`core/character/compact.ts`):
starší revize se sloučí do výchozí revize „Zhuštěná historie“ a novější zůstanou; míra zhuštění se hledá půlením,
aby se zachovalo co nejvíc historie. Jen pro QR (kód, soubor a sdílení posílají celou historii). Balíček nese
`compact: { upTo, hash }`; příjemce s plnou historií ověří otisk (`stateHash`) a starší revize vynechá, příjemce
bez deníku dostane výchozí stav jako první revizi, při neshodě nebo chybějícím základu je upozorněn.
Ověřeno: postava se 14 revizemi 3872 znaků → 689 znaků (1 QR), QR přečteno zpět a import dal shodný stav.
Když se nevejde ani zhuštěný stav, vynechají se poznámky, pak i příběh hrdiny (`omitted` v balíčku, příjemce
je upozorněn). Ověřeno: 5595 znaků (8 QR) → 1 QR.

## Nápad: přenos dat zvukem (retro)

Přenos kódu mezi telefony zvukem, jako se kdysi posílala data z kazeťáku do 8bitu nebo APRS / packet radio mezi
vysílačkami: jedno zařízení poslouchá (mikrofon), druhé kód „přehraje nahlas“. Modulace přes Web Audio
(FSK/AFSK, případně OFDM) pro přenos desítek až stovek bajtů za pár sekund; rámce s kontrolním součtem
(CRC), číslováním a opravou chyb; **handshake** (volání → odpověď o připravenosti) a **potvrzení o přijetí**
(ACK, případně žádost o opakování poškozených rámců) hlasem druhého zařízení. Bez serveru a bez kamery,
funguje mezi blízkými zařízeními i přes vysílačku. Zábavné i užitečné, když selže kamera nebo světlo. Rizika:
šum v místnosti, mikrofon vyžaduje povolení a https, rozdíly zařízení; začít jednoduchým FSK s jedním
kanálem a opakováním, pak teprve OFDM. Využije stejný balíček a kód `DRD2:` (stlačený, případně zhuštěný).

## Úprava postavy podle pravidel (hotovo)

- **Postup** (`core/character/advance.ts`, `Advance.svelte`): za 12 bodů zkušeností buď úroveň povolání + schopnost
  povolání, nebo zdatnost +1 + schopnost rasy / ovládaného povolání; nejvyšší úroveň 5, pokročilé povolání
  vyžaduje 6 úrovní ve dvou základních (po jedné z každého; `requires` odvozené z SRD), volitelné zapomínání.
  Výsledek jde do návrhu úpravy s předvyplněným popisem; zveřejní se v editoru jako revize.
- **Zkušenosti** (`xp`, nespotřebované body) a **Jizvy** (`scars`, snižují zdatnost) jsou v deníku (revize,
  sdílení, kontrola postavy); **Zdroje** (čerpání Tělo/Duše/Vliv) jen v zařízení (`play.ts`), ne v historii.
- Kontrola postavy počítá se zlepšením zdatnosti (schopnost navíc) a hlídá pokročilá povolání a jizvy.
- Popis změny se ukládá do návrhu. Nápověda u položek bez textu odkazuje na SRD (`srd` v kostře).

Hojení jizev je hotovo (Zmírnit o 1 / Zahojeno na detailu postavy, revize v deníku; `core/character/healing.ts`; obnovu Zdrojů jizvy už omezují).
Zbývá: Suroviny, povolání z Her mocných,
přidělení XP za sezení pro celou družinu (až s družinami).

### QR: velikost dílů (z testu na telefonu)

Samsung A52s nenaskenoval díl o 700 znacích (QR s 89 moduly, asi 3,5 px na modul na displeji). Díly jsou nově
nejvýš 300 znaků, stejně velké, s opravou chyb M (65 modulů, asi 4,7 px) a zobrazené až na 30 rem; střídají se po
2 s. Počty QR pro zhuštění: 1 až 4 (výchozí 2). Další ladění podle zkušeností: menší díly (200 znaků), větší
kontrast / celá obrazovka, pomalejší střídání.

## Družiny (první verze hotovo)

Modul **Družina** (`src/modules/parties`, `core/party`): družina má členy (postava v zařízení, nebo jen jméno hráče),
poznámky a **žurnál dobrodružství** (zápisy s datem a autorem, úpravy, mazání). **Sezení**: přítomní, odměny
(nejvýš 2 body na hráče, odměnových bodů nejvýš hráči + 1) a shrnutí; za účast 4 body, sečte se a zapíše do žurnálu;
členům s postavou v zařízení se body rovnou připíšou jako revize deníku („Zkušenosti za sezení…“), ostatním se
označí „předat hráči“. Uloženo v IndexedDB (`parties`, verze databáze 4).

Sdílení družiny, role Průvodce / hráč a přehled družiny jsou hotové (viz níže).
Hotovo: rychlost postupu družiny (3 / 4 / 6 bodů za účast) a tajné odměny (hlasování, zapisují se jen součty).

### QR jako odkaz do aplikace (z testu na telefonu)

Systémová čtečka QR (Samsung) text `DRD2:…` načetla, ale nemohla ho předat aplikaci. QR proto obsahuje **odkaz**
`<adresa aplikace>#/postavy/import/<kód nebo díl>` (volba „QR obsahuje odkaz do aplikace“, výchozí zapnuto):
čtečka fotoaparátu ho otevře přímo v aplikaci a Import kód převezme. U kódů z více QR se díly otevírané postupně
skládají (uložené v zařízení 15 minut, „Zahodit naskenované díly“). Čtečka v aplikaci rozumí odkazům i holému
kódu. Díly mají nejvýš 500 znaků kódu (s odkazem asi 556 znaků v QR). Nápad: QR na celou obrazovku.

## Aktualizace a instalace PWA (hotovo, ověřit na telefonu)

- **Aktualizace** (`core/pwa.svelte.ts`, `ui/AppBanners.svelte`): service worker stáhne novou verzi na pozadí a
  nad navigací se nabídne „Obnovit“ (rozepsané návrhy jsou uložené v zařízení). Kontrola při spuštění, po návratu do
  aplikace (nejvýš co 10 min) a každou hodinu; ruční tlačítko je v Knihovna → Aplikace (verze, datum sestavení).
- **Instalace**: tlačítko „Nainstalovat“ (Chrome/Edge: událost `beforeinstallprompt`) v pruhu a v Knihovna → Aplikace;
  na iOS návod Sdílet → Přidat na plochu; ikony PNG (192, 512, maskable, apple-touch) v `public/icons`
  (`tools/make-icons.mjs`), manifest s `purpose: maskable`.
- Stav: tlačítka a pruhy ověřeny simulací událostí; samotný service worker se v prohlížeči vývojového panelu nedá
  zaregistrovat (chyba prostředí), takže celý cyklus nové verze je potřeba zkusit na telefonu po nasazení
  (nasadit verzi A, otevřít, nasadit verzi B, otevřít znovu: má se objevit pruh „Je dostupná nová verze“).
  Pozor: první nasazení s tímto kódem se do telefonů dostane ještě starým mechanismem (autoUpdate), až další
  verze už přes pruh.

## Sdílení družiny a žurnálu (první verze hotovo)

Pravda je u **Průvodce** (`core/party/share.ts`, `PartyShare.svelte`, Import v `ImportPanel`): Průvodce posílá družinu
(členy, poznámky, schválené zápisy a zkušenosti ze sezení; jen nové od posledního odeslání, nebo celou) a hráč si
ji uloží jako **kopii** (role `hrac`). Hráč navrhuje zápisy, které Průvodce **přijme** do žurnálu, nebo **zamítne**
(zamítnutí se hráčům vrátí s další družinou). Hráč nemění schválené zápisy ani členy; „připsáno“ u zkušeností je
vždy místní. Přenos jako u postav: kód, soubor, QR (s odkazem do aplikace), Web Share. Ověřeno celým cyklem
Průvodce → hráč → návrhy → schválení / zamítnutí → hráč.

Zbývá: sdílení členů s postavami (ID postav z jiných zařízení) a značka „změněno Průvodcem“ u zápisů. Více Průvodců se nedělá (uživatel je Průvodcem i hráčem). Přehled družiny je hotový.

### QR bez obrázků (hotovo)

Ukládání QR jako PNG se zrušilo (zbytné): kód se ukládá a posílá jako text nebo soubor (AirDrop, Quick Share). Díl QR má
nově až 500 znaků kódu (s odkazem asi 556); zkusit na A52s, případně vrátit menší. Zbývá QR na celou obrazovku.


### Příjem sdíleného souboru (první verze hotovo)

Manifest má `share_target` (POST, text/plain): po instalaci PWA se aplikace nabídne v nabídce Sdílet (soubor `.drd2.txt`
nebo text kódu). `public/share-target.js` (importovaný do service workeru) uloží kód do cache `drd2-shared` a přesměruje na
`#/postavy/import/sdileno`, kde ho Import načte (`core/sharedInbox.ts`). Ověřit na telefonu (jen u nainstalované PWA).
`file_handlers` se nedělají: fungují jen na počítači a soubor je `.drd2.txt`.

## Nápad: skiny s obrázkovou mapou ovládacích prvků (později)

Skin by definoval ovládací prvky souřadnicemi na jednom velkém obrázku: **tlačítko** (klikací oblast), **popis** (label) a
**výstup** (textové pole), případně pevné rozvržení. Dvě varianty: pixelartový (jako Truhlice) se škálováním podle poměru stran,
nebo v celých násobcích s posouváním viditelné oblasti, a klasický plovoucí. Předpoklad: nejdřív uklidit stránky a navigaci
(pět záložek: Postava, Družina, Příručka, Bestiář, Více), aby definice oblastí odpovídala hotovému rozvržení.

## Nápady z procházení stránek

- Generátor jmen: viz větev `generator-jmen` nahoře.
- **Dovednosti bez balíčku jako odkaz do SRD** na konkrétní dovednost (v kostře je `srd` jen u povolání a schopností); dát
  až po odpovědi na dotaz o textech pravidel a nepřeplácat stránku odkazy.
