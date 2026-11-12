# Nápady a dolaďování

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

## Import z SRD přímo v zařízení uživatele (bookmarklet)

Web SRD nemá hlavičky CORS, takže aplikace ani stránka na `github.io` z něj stahovat nemůže (Google Disk se
zdroji je zastaralý a pro prohlížeč nepoužitelný). Řešení bez serveru je **bookmarklet**: uživatel otevře
`drd2srd.d20.cz`, klepne na záložku „Převést SRD“, kód běží na stránce SRD (stejná doména, CORS neplatí),
stáhne stránky podle navigace, převede je a nabídne ke stažení balíček (`.json`), který se nahraje v Knihovně.

- Text se nehostuje, bere se z webu SRD u uživatele, převodník zvládne vždy aktuální verzi SRD.
- Potřeba: převodník jako čisté funkce nad řetězci (bez `node:fs`), WebP přes canvas místo `sharp`,
  stránka s návodem (přetáhnout tlačítko do lišty záložek). Odhad 2–3 dny.
- Ověřit: web SRD nevysílá CSP (načtení skriptu z `github.io` by mělo projít).
- Mobil: iOS Safari a Firefox pro Android bookmarklety zvládají, Chrome pro Android ne spolehlivě. Alternativa:
  balíček sestavit na počítači a soubor přenést.

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
Zbývá: hotové sady výbavy a ceník bez balíčku (nyní se výbava píše ručně), hláška „Popis je v balíčku“
u položek bez textu.

## Sdílení revizí (první verze hotovo)

Hráč: Postava → **Sdílet…** (`SharePanel`): kód `DRD2:` (stlačený JSON), soubor nebo systémové sdílení; posílají se
změny od posledního odeslání, nebo celá postava (nová postava asi 450 znaků, revize s několika změnami asi 400).
Vypravěč: Postavy → **Import…** (`ImportPanel`): náhled „před → po“ po revizích, detekce navázání / rozdílného
stavu / neznámého základu a konfliktů, **Přijmout** (zaškrtnuté) nebo zamítnout, volitelně kód **odpovědi**
hráči (přijato / zamítnuto + poznámka). Hráč odpověď naimportuje: revize dostanou štítek (odesláno / přijato /
zamítnuto) a zamítnuté změny lze jedním tlačítkem vrátit. Jádro: `core/character/share.ts` (balíček, očištění,
analýza), `reviews.ts` (stav revizí). Přijaté revize se do deníku vypravěče přidají beze změny ID.

Zbývá: QR (knihovna pro generování a čtení, případně více QR), zhuštění historie (viz výše), Web NFC,
Wi-Fi/WebRTC, otevření souboru přímo z AirDropu / Quick Share (`file_handlers`, `share_target` v manifestu),
kontrola postavy po každé příchozí revizi (`checkCharacter`) v importu, ruční slučování konfliktů.

## QR a kontrola při importu (hotovo)

Kód `DRD2:` se zobrazí jako QR (`qrcode-generator`, `src/ui/QrView.svelte`); delší kód se rozdělí na díly
`DRD2Q:id.i.n.…` (700 znaků na QR), která se střídají a čtečka je složí (`core/character/qr.ts`). Čtečka
kamerou (`jsqr`, `src/ui/QrScanner.svelte`) je v Importu; potřebuje https nebo localhost a povolení kamery.
Ověřeno v prohlížeči na vykresleném QR (4 díly, 2,7 kB kódu se složily shodně); čtení skutečnou kamerou a
na telefonu zatím nezkoušeno. Import ukazuje kontrolu postavy po přijetí zaškrtnutých revizí a označuje nové
problémy proti současnému stavu.

Zbývá: ověřit čtení kamerou na telefonu (světlo, velikost QR), případně větší díly / ECC podle zkušeností,
zhuštění historie, NFC, Wi-Fi/WebRTC, `file_handlers` a `share_target`.

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
