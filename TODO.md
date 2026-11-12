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
