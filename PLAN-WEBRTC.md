# Přenosy v reálném čase (WebRTC): sezení bez internetu

Návrh plánu, stav: **ke schválení** (26. 11. 2026). Nic z toho není hotové. Navazuje na dnešní přenosy (kód, soubor, QR, zvuk;
`FORMAT.md` → Přenos postavy a družiny) a na pořadí v `TODO.md` (Wi-Fi / WebRTC → QR na celou obrazovku a tisk → NFC).

## Cíl

U stolu bez internetu propojit zařízení hráčů a vypravěče a posílat si mezi nimi data jedním klepnutím: bez souborů, e-mailů a
opisování kódů. Aplikace zůstává statická PWA bez vlastního serveru; **data nikdy neprocházejí třetí stranou**.

## Požadavky (od uživatele) a návrhy (doplněné)

| # | Požadavek | Kde se řeší |
|---|---|---|
| 1 | Sestavení sezení offline (hotspot, iniciace QR / NFC) | etapy 0, 2, 3, 8 |
| 2 | Hotspot může zřídit kdokoli, nemusí být vypravěč | síť ≠ role (viz Architektura) |
| 3 | Hráč → vypravěč: jedna postava, zpráva, skrytý návrh zkušeností | etapa 4 |
| 4 | Vypravěč → hráč: jedna zpráva či postava | etapa 4 |
| 5 | Vypravěč → všem: zpráva, výprava, záznam sezení | etapa 6 |
| 6 | Rozeslání změn najednou, každému jen to, co je jeho | etapa 5 |
| 7 | Sdílení nezávislé na roli (Háv, Bytost, Cizí postava, Výprava) i mezi vlastními zařízeními | etapy 1, 7 |
| N1 | Zásilky se nikdy nepřijmou bez souhlasu uživatele, vždy se očistí | všechny etapy |
| N2 | Fronta k odeslání a opakování po výpadku (telefon usne, spojení spadne) | etapa 5 |
| N3 | Ilustrace smí tímto kanálem (rozhodnutí z 21. 11. 2026), po částech a s kontrolou | etapa 6 |
| N4 | Ověření, s kým jsem spojen (otisk v QR, případně krátký ověřovací kód) | etapa 2 |
| N5 | Spojení přes internet jako volitelné (veřejný STUN je jen na výslovný souhlas) | etapa 2 |

## Architektura

**Tři vrstvy, každá testovatelná zvlášť.**

1. **Přenosová vrstva (`Transport`).** Rozhraní `send(bytes)`, `onMessage`, `state`. Implementace: WebRTC `RTCDataChannel`
   a paměťová (pro testy). Zná jen bajty, rozděluje na kousky (cca 16 KB), hlídá `bufferedAmount`, zná potvrzení a pořadí.
2. **Protokol sezení.** Obálka `{ v, id, type, from, to?, ts, payload }`. Role a práva nejsou v síti, ale v aplikaci
   (Průvodce / hráč v družině). Typy: `hello` (ohlášení zařízení: jméno, `deviceId`, která ID postav a členů si nárokuje),
   `ack`, `ping`, `zasilka` (nese libovolnou zásilku z vrstvy 3), `stav` (kurzor synchronizace).
3. **Zásilky (`Shareable`).** Jednotný registr druhů obsahu: `kind`, `build`, `sanitize`, `apply` (do schránky k potvrzení),
   popisek pro uživatele. Stávající obálky `revize`, `odpoved`, `druzina`, `predpisy` se **nemění** a jen se do registru
   zapojí; přibudou `bytost`, `cizi-postava`, `hav` (`.drdskin`), `vyprava`, `zapis-sezeni`, `zprava`, `navrh-zkusenosti`.
   Totéž tak jde poslat i souborem či kódem, takže vrstva 3 je užitečná i bez WebRTC.

**Síť a role jsou oddělené.** Hotspot (nebo Wi-Fi) je jen cesta. Na ní běží **uzel sezení** (hub): zařízení, které zobrazuje
pozvánku a přijímá připojení. Bývá to vypravěč, ale nemusí; role Průvodce / hráč platí jen na úrovni družiny. Topologie je
hvězda (každý hráč jedno spojení k uzlu). Po prvním propojení může uzel předávat signalizaci dalším zařízením po
existujících kanálech, takže další hráč nepotřebuje skenovat nic jiného než pozvánku. Spojení hráč–hráč (např. sdílení Hávu) se
domluví přes uzel a vznikne přímo, nebo proběhne přes uzel jako relé (rozhodnout po etapě 0).

**Signalizace bez serveru.** WebRTC vyžaduje výměnu nabídky a odpovědi (SDP). Dělá se mimo síť:
- nabídka jako QR na obrazovce uzlu, odpověď jako QR na obrazovce hráče (naskenuje uzel); tedy dvě skenování na hráče;
- stejný obsah jde přenést kódem `DRD2:`, textem přes libovolný messenger, souborem nebo zvukem (hotové přenosy, přidá se jen
  nový typ obálky);
- **zhuštění**: data channel nepotřebuje celé SDP. Posílá se jen otisk DTLS (32 B), `ufrag`, `pwd` a kandidáti (IP, port) v
  binární obálce kolem 150 až 250 B, ze které se SDP na druhé straně složí podle šablony. Vejde se do jednoho QR dílu a čte se
  rychle. Záloha: celé SDP stlačené (pár set bajtů až 1 KB, vícedílné QR jako dnes).
- otisk DTLS je v QR, takže skenování zblízka zároveň **ověří protistranu**; u textu mimo QR se zobrazí krátký ověřovací kód
  (4 slova či číslice) k porovnání nahlas.

**Žádný STUN/TURN ve výchozím nastavení.** Na hotspotu či Wi-Fi stačí lokální kandidáti. Volba „Povolit veřejný STUN
(spojení přes internet)“ je vypnutá a vysvětlí, že STUN server uvidí IP adresu.

## Rizika a otevřené technické otázky (řeší etapa 0)

1. **mDNS kandidáti.** Chrome i Safari ve výchozím stavu skrývají lokální IP za jméno `xxxx.local`. Na hotspotu to nemusí
   fungovat (izolace klientů, chybí mDNS). Zkoušet: Android ↔ Android, Android ↔ iPhone, počítač ↔ telefon, hotspot z Androidu
   i iPhonu (včetně „maximální kompatibility“), domácí Wi-Fi, host Wi-Fi s izolací. Náhradní řešení: pole „Moje adresa“
   (uživatel opíše IP z nastavení Wi-Fi) a ruční doplnění kandidáta při skládání SDP.
2. **iOS Safari a uspání.** Datový kanál se po zhasnutí displeje přeruší. Návrh: spojení bere jako přechodné, fronta zásilek
   (etapa 5) a automatické obnovení (ICE restart, jinak nová pozvánka). Držení displeje už máme u časomíry.
3. **Web NFC.** Funguje jen v Chrome na Androidu, jen čte a zapisuje **štítky**, mobil-mobil přes něj neposílá a iOS nic.
   Realisticky: štítek (nálepka) s trvalým odkazem na pozvánku do sezení či do aplikace. Dynamická signalizace (kandidáti se
   mění) přes NFC nejde. Proto je NFC až poslední etapa a jen jako zkratka; základem zůstává QR.
4. **Velikost.** Ilustrace a výpravy jsou stovky kB. Kousky s kontrolním součtem, ukazatel postupu, možnost přerušit.
5. **Zátěž a zneužití.** Příchozí obsah je nedůvěryhodný: limity velikosti a počtu, omezení rychlosti, vždy `sanitize*`,
   nic se nepoužije bez potvrzení v schránce (stejný model jako dnešní příjem souboru, `sharedInbox`).
6. **Identita zařízení.** `deviceId` + klíč (WebCrypto, ECDSA P-256) vytvořený při prvním použití, uložený jen v zařízení.
   Párování „Moje zařízení“ si pamatuje veřejný klíč. Do zálohy nepatří (nové zařízení = nová identita).

## Etapy

Každá etapa má vlastní větev a PR do `develop`, vydává se jen na pokyn. Značka stavu: 🚧 rozpracované, ✅ hotové.

| Etapa | Obsah | Ověření |
|---|---|---|
| 0 | **Průzkum** (zahodit po rozhodnutí): jednoduchá stránka, která propojí dvě zařízení přes QR bez serveru; matice zařízení a sítí z rizika 1; měření velikosti zhuštěné signalizace; rozhodnutí o relé hráč–hráč | tabulka výsledků v `PLAN-WEBRTC.md`, rozhodnutí uživatele |
| 1 | **Zásilky.** Registr `Shareable`, sjednocená schránka s popisky a potvrzením. Zapojit stávající obálky; přidat `bytost`, `cizi-postava`, `hav`, `vyprava` (export a import výprav souborem je tak i odložený úkol z `TODO.md`), `zapis-sezeni`, `zprava` | jednotkové testy, E2E soubor/kód |
| 2 | **Spojení 1:1.** Kodek signalizace (zhuštěný i plný), `Transport` (kousky, potvrzení, zpětný tlak), stránka Více → Propojit (zobrazit/skenovat QR, kód, text), ověřovací kód, volba STUN, `hello` | test dvou kontextů Playwright přes smyčku, test protokolu s paměťovým přenosem |
| 3 | **Sezení (hvězda).** Uzel sezení, seznam účastníků a stav spojení, předávání signalizace přes existující kanál, návod na hotspot (Android, iPhone), `hello` s nárokem na postavy a členy (řeší i odložené „ID postav z jiných zařízení“) | E2E tři kontexty, ruční zkouška na telefonech |
| 4 | **Jednotlivé zásilky hráč ↔ vypravěč.** Tlačítko „Poslat vypravěči“ (postava, revize, zpráva, skrytý návrh zkušeností pro spoluhráče) a „Poslat hráči“ (zpráva, postava, odpověď na návrh); příjem do schránky | E2E |
| 5 | **Rozeslání změn.** Tlačítko „Odeslat všem“ u Průvodce: pro každého účastníka se **zvlášť** sestaví jen jeho obsah (jeho postavy, jeho odměny a zkušenosti, tajné odměny jen adresátovi). Kurzor synchronizace u každého zařízení (od kterého zápisu žurnálu už má), fronta k odeslání a opakování po obnovení spojení, souhrn „komu co dorazilo“ | jednotkové testy sestavení pro adresáta (kontrola, že nic cizího neuniká), E2E |
| 6 | **Rozhlas.** Zpráva, výprava, záznam sezení všem; ilustrace po kouscích (rozhodnutí z 21. 11. 2026 to povoluje jen u souboru, exportu a WebRTC) s kontrolním součtem a obnovením přenosu | E2E |
| 7 | **Moje zařízení.** Trvalé párování (veřejné klíče), výběr, co se synchronizuje (revizní deník postav se slučuje stávající analýzou `navazuje` / `jiny-stav`), režim „vedu hru z tabletu a telefonu“: stejná družina a sezení na více zařízeních (poslední zápis vyhrává podle `updated`, časomíra se řídí razítky) | E2E, ruční zkouška |
| 8 | **Dotažení.** QR na celou obrazovku a tisk (pozvánka do sezení na papír), NFC štítek (Android), nápověda „?“, `FORMAT.md` (nová část Přenos v reálném čase, číslo `v`), `CHANGELOG.md`, vydání | ověření na telefonech |

Závislosti: 1 je nezávislá a užitečná sama (dá se vydat dřív). 2 závisí na 0, 3 na 2, 4 až 6 na 1 a 3, 7 na 2 a 1.

## Dopady na formát a pravidla

- Nová obálka protokolu má vlastní číslo `v` (`SESSION_PROTO_VERSION`); starší aplikace spojení srozumitelně odmítne.
- Úložiště: `deviceId` a klíče do lokálního klíče (ne do zálohy); kurzory a fronta k odeslání do nového úložiště
  (DB verze se zvýší, migrace a test podle `FORMAT.md`).
- Soukromí: časomíra a poznámky Průvodce se nikdy nerozesílají; žádný zápis do GoatCounteru z obsahu přenosů.
- Doplnit paměť i `FORMAT.md` při první změně formátu.

## Rozhodnutí k potvrzení

1. Souhlasíš s pořadím, kdy etapa 0 (průzkum, zahozený kód) rozhoduje o zhuštěné signalizaci a mDNS náhradě?
2. Hráč–hráč: napřed jen přes uzel (relé), nebo přímo? Navrhuji relé, přímé spojení až když se osvědčí.
3. Etapa 1 (Zásilky) vydat samostatně hned, protože pomůže i bez WebRTC?
4. Etapa 7 (Moje zařízení, vedení hry z více zařízení) je největší riziko; ponechat až po vyzkoušení sezení v praxi?
5. Veřejný STUN: nechat jako volbu (vypnutou), nebo úplně vynechat?
