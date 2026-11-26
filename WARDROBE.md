# Šatník (modul `wardrobe`) a formát Hávu

Šatník převléká aplikaci. Jeden vzhled se jmenuje **Háv** (soubor `.drdskin`). Šatník je modul v Dílně (Sluj → Dílna);
rozhodnutí, zda zůstane modulem, nebo se stane samostatnou aplikací, se odkládá za M3.

## Zásady

- Aplikace zůstává **obdélníková**. Háv ji dekoruje (barvy, písmo, textury, rámy, ikony), tvar okna nemění.
- Hlavní cíl je **telefon** (na výšku i na šířku). Šatník samotný se používá hlavně na **desktopu** (správa a náhled),
  výstupem je soubor, který se naimportuje na telefonu.
- Háv je **komunitní vstup**, tedy nedůvěryhodný: všechno se validuje, nic se neskládá do textu CSS (jen `style.setProperty`),
  žádné skripty, žádné `url()` mimo vlastní soubory Hávu.
- Háv se nemá vázat na zařízení ani poměr stran. Skládá se z natahovatelných dílů (roztažení, dlaždice po osách, 9-slice,
  ornamenty kotvené k okrajům s ohledem na `safe-area`), nikdy z obrázku celé obrazovky.
- Čitelnost má přednost: obsahová plocha musí mít čitelný text. Háv se kontroluje na kontrast.

## Třídy viewportu

Háv se řídí rozměry viewportu, ne typem zařízení.

| Třída šířky | Šířka | Typicky |
|---|---|---|
| `compact` | < 600 px | telefon na výšku |
| `medium` | 600–1000 px | telefon na šířku, tablet na výšku, malé okno |
| `expanded` | > 1000 px | tablet na šířku, desktop |

Dále `orientation` (`portrait` / `landscape`) a příznak nízkého viewportu (výška < 480 px; telefon na šířku).
Varianty Hávu jen **přepisují** společné hodnoty; co varianta neuvede, zdědí.

## Tokeny (M1)

Role jsou oddělené, aby je Háv mohl ladit samostatně (viz `src/themes/default.ts`):

| Token | Role |
|---|---|
| `--drd-bg`, `--drd-surface` | plochy |
| `--drd-text`, `--drd-text-muted` | text a tlumený text |
| `--drd-border` | okraje a dělicí čáry |
| `--drd-accent` | zvýraznění |
| `--drd-danger`, `--drd-success`, `--drd-warning` | stavové barvy textu |
| `--drd-scrim`, `--drd-shadow` | zástěna za dialogy, stín plovoucích prvků |
| `--drd-nav-position` | poloha hlavní lišty: `bottom` (výchozí), `top`, `left`, `right` (svislý pruh); výčet, jiná hodnota je chyba |
| `--drd-shape-panel`, `--drd-shape-button`, `--drd-shape-dialog` | tvar panelů, tlačítek a oken: `rect` (výchozí), `chamfer` (seříznuté čtyři rohy), `notch` (levý horní a pravý dolní roh); výčet |
| `--drd-shape-size` | velikost seříznutí, 2 až 16 px (výchozí 6 px) |
| `--drd-panel-opacity` | průhlednost pozadí panelů, celé procento 60 až 100 (výchozí `100%`); pod panelem prosvítá pozadí stránky |
| `--drd-text-shadow` | stín textu (embos); výchozí `none`, smí mít 1–3 vrstvy bez `inset` a rozšíření |
| `--drd-radius`, `--drd-gap`, `--drd-font` | tvar, mezery, písmo |

Komponenty nesmí mít pevné barvy ani rozměry mimo tokeny. Výjimky: QR kód (musí být černobílý) a pozadí prohlížeče obrázků.

## Soubor `.drdskin` (ZIP)

```
manifest.json        povinný
assets/…             obrázky (PNG, WebP, JPEG, SVG), jen ty, které manifest odkazuje
```

`manifest.json`:

```jsonc
{
  "schema": 1,                       // verze formátu Hávu
  "id": "pergamen",                  // malá písmena, číslice a pomlčky
  "name": "Pergamen",
  "version": "1.0.0",
  "author": "…",
  "license": "…",                    // povinná; Háv nesmí obsahovat cizí chráněné ilustrace
  "scheme": "light",                 // light | dark (kvůli prvkům prohlížeče)
  "minApp": "0.5.0",
  "tokens": { "--drd-bg": "#f6f1e6" },
  "variants": [                      // přepisují tokeny a role podle viewportu
    { "when": { "width": "compact", "orientation": "landscape" }, "tokens": { "--drd-gap": "0.5rem" },
      "roles": { "panel": null } }   // role ve variantě: jiná role, nebo null = vypnout
  ],
  "assets": { "mramor": { "file": "assets/mramor.svg" } },   // název → soubor v archivu
  "roles": { "background": { "image": "mramor", "mode": "repeat", "size": 256 } },
  "icons": { "postavy": "ikona-postavy" },                    // id modulu → název obrázku
  "iconStyle": { "pixelated": false }
}
```

### Role prvků (M2)

Role dá obrázek části aplikace. Šest rolí a prvek, na který se uplatní:

| Role | Prvek |
|---|---|
| `background` | pozadí celé aplikace (pevná vrstva za obsahem, `body::before`) |
| `panel` | `.panel` (karty a bloky; použito 142× v 60 souborech) |
| `button` | `button`, `.btn` |
| `tab` | spodní lišta záložek; pořadí, skrytí a přišpendlení záložek nastavuje uživatel (`settings.tabbar`, `core/tabbar.ts`), ne Háv; role `tab` platí na celou lištu, střed lišty se na úzkém telefonu posouvá do stran |
| `divider` | `hr` |
| `dialog` | okna (`dialog`): potvrzení a formuláře v oknech |
| `header` | záhlaví: pás nad obsahem s názvem aplikace; povinná `height` 16 až 160 px, režim nesmí být `slice`; odroluje se s obsahem; varianta ho může vypnout (`null`) |

Pole role: `image` (název z `assets`), `mode`, a podle režimu `size`, `position`, `slice`, `width`, `fill`, `edge`,
`height` (jen `divider`), `pixelated` (jen `background`).

| `mode` | Chování |
|---|---|
| `stretch` | roztažení na celou plochu (poměr se nezachovává) |
| `contain`, `cover` | celý obrázek / vyplnění plochy, poměr se zachová (`position` = kotva) |
| `repeat`, `repeat-x`, `repeat-y` | dlaždice v obou osách / jen vodorovně / jen svisle (`size` = šířka dlaždice v px) |
| `slice` | devítidílný rámeček (`border-image`): `slice` = okraje zdroje v px (číslo, nebo nahoře, vpravo, dole, vlevo), `width` = tloušťka na obrazovce (výchozí = `slice`, tedy bez zvětšení), `fill` = vyplnit střed (výchozí ano), `edge` = `stretch`, `repeat`, `round`, `space` |

Role se převede na CSS proměnné `--drd-<role>-image|size|repeat|position` (nebo `-bi-source|slice|width|repeat` a `-bw`
u rámečku); globální styly v `app.css` je čtou s výchozími hodnotami, takže **bez obrázku se vzhled nemění ani o pixel**.
Do CSS se nikdy nevkládá text z manifestu, jen ověřená čísla, pevná klíčová slova a adresa `blob:` vyrobená aplikací.

`pixelated` (ostré zvětšení) jde jen u pozadí, protože `image-rendering` se dědí a u panelů a tlačítek by změnilo i
obrázky uvnitř (ilustrace postav). U rámečků proto platí výchozí šířka = řez, tedy zvětšení 1:1. Obrázky pod textem
validátor kontrastu nepozná: čitelnost textu na obrázku je odpovědnost autora Hávu.

**Ikony:** `icons` mapuje id modulu v navigaci (`postavy`, `druziny`, `vypravy`, `ctenar`, `bestiar`, `grimoar`, `knihovna`)
na obrázek; modul bez ikony i ikona, která se ještě nenačetla, zůstávají se znakem (emoji). `knihovna` je záložka **Sluj** (od 0.5.5; id zůstalo kvůli adresám a existujícím Hávům). Ikony `ctenar`, `bestiar` a `grimoar` se použijí na záložce, je-li v liště, i na dlaždicích ve Sluji.

**Navigace (0.5.5):** výchozí lišta má Postavu, Družinu, Výpravy a Sluj; Příručka, Bestiář a Grimoár jsou ve Sluji a jdou do lišty přidat v Dílně. Sekce mimo lištu zvýrazňují Sluj. Pořadí a viditelnost záložek určuje uživatel, ne Háv; M3 má tento model (`TabbarConfig`) číst.

### Validace při importu

- Povolené klíče tokenů jen z výše uvedené sady (`--drd-*`); neznámé se zahodí s upozorněním.
- Hodnota podle typu, s vlastním přísným parserem (žádné `CSS.supports`, takže funguje i v testech a ve workeru):
  - **barva:** `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()`, `hsl()` (čárkový i mezerový zápis); pojmenované barvy ne.
    `bg`, `surface`, text a akcent musí být neprůhledné, `scrim` smí mít průhlednost.
  - **délka:** `px`, `rem`, `em` (1 rem = 16 px); `radius` 0–48 px, `gap` 4–32 px.
  - **písmo:** 1–8 systémových písem, víceslovné názvy v uvozovkách, poslední musí být obecná rodina
    (`sans-serif`, `serif`, `monospace`, `system-ui`). Žádné `@font-face`.
  - **stín:** `none`, nebo 1–3 vrstvy s právě jednou barvou, 2–4 délkami (každá do 64 px), rozostření nezáporné.
  - Nikdy `url()`, `var()`, `calc()`, `;`, `{`, `}`, `\`, `@`, `<`, `>`, komentáře ani řídicí znaky; hodnota nejvýše 200 znaků.
  - Žádné vlastní fonty (písma jen systémová).
- **Obrázky** (`image.ts`, kontrola obsahu, ne přípony ani deklarace):
  - typ se pozná podle podpisu souboru: PNG, WebP (lossy, lossless, VP8X), JPEG, SVG; cokoli jiného je chyba;
  - rastr: rozměry se přečtou z hlavičky bez dekódování, nejvýše 4096 px na straně a 8 milionů pixelů na obrázek,
    dohromady 16 milionů pixelů; soubor nejvýše 2 MB, archiv 8 MB, nejvýše 32 obrázků;
  - SVG (nejvýše 512 kB, UTF-8) se používá jen jako obrázek na pozadí, nikdy vložený do stránky, takže se v něm nespustí
    skript ani nenačte nic zvenčí; přesto se odmítá `<script>`, `foreignObject`, `iframe`, `embed`, `object`, události
    (`on…=`), `javascript:`, `@import`, entity a `DOCTYPE` a všechny odkazy (`href`, `xlink:href`, `url()`) mimo `#id`;
  - cesta souboru musí být pod `assets/` a bezpečná; role a ikony smí odkazovat jen na existující obrázky; obrázek, který
    nic nepoužívá, a soubor mimo manifest varují. Obrázky se při čtení z úložiště kontrolují znovu.
- Limity: manifest nejvýše 64 KB, nejvýše 16 variant; `id` nesmí být vestavěné (`system`, `default-dark`, `default-light`,
  `pergamen`, `noc`, `podzemi`).
- Neznámé položky a tokeny se ignorují s varováním (kvůli budoucím verzím formátu), neplatné hodnoty jsou chyba.
- Kontrast (WCAG) na `bg` i `surface`: `text`, `text-muted`, `accent`, `danger`, `success`, `warning`.
  Pod 3:1 je chyba (Háv se nedá aktivovat), pod 4,5:1 jen varování. Okraje nejsou text: chyba pod 1,5:1, varování pod 3:1.
  Kontroluje se po sloučení variant pro všech 12 kombinací viewportu, shodné výsledky se hlásí jednou.

## Načítání, úložiště a volba

- **ZIP bez závislostí** (`src/core/skin/zip.ts`): vlastní čtečka a zapisovač nad `DecompressionStream('deflate-raw')`.
  Čte nedůvěryhodný vstup, proto: bez ZIP64, šifrování a vícedílných archivů; velikost se hlídá podle hlavičky i za běhu
  rozbalení (hlavička může lhát, zip bomba); bezpečné názvy souborů; kontrola CRC-32. Limity: soubor 8 MB,
  položka 2 MB, 64 položek, manifest 64 kB.
- **Úložiště** (`store.ts`): samostatná databáze `drd2-wardrobe` (ne `drd2-data`, aby změna vzhledu neriskovala
  migraci postav a družin). Každý Háv se při čtení znovu zvaliduje, neplatný se přeskočí. Nejvýše 30 Hávů, stejné `id` Háv
  přepíše. Hávy **nepatří do celkové zálohy** (rozhodnuto): přenášejí se jen samostatným exportem a importem `.drdskin`.
- **Volba** (`settings.skin`): výchozí je vestavěný Háv `podzemi` (`DEFAULT_SKIN`, od 0.5.3), dokud si uživatel nezvolí jiný; uložená volba má vždy přednost, takže `system` (Podle systému), `default-light`, `default-dark` nebo `id` nainstalovaného Hávu se respektují. Při vydání 0.5.4 se Podzemí jednorázově zapnulo všem (značka `skinIntro` v `drd2-settings`), aby si změny všimli; potom už platí uložená volba.
  Smazaný či neplatný Háv spadne na „podle systému“, aplikace zůstane vždy použitelná.
- **Viewport za běhu** (`runtime.ts`): přepočítává se při `resize` a `orientationchange` (s kontrolou po 250 ms, protože
  některé prohlížeče pošlou událost dřív, než se přepočítají rozměry). Při psaní do pole se orientace a „nízký“ viewport
  nemění, jinak by vysunutá klávesnice na telefonu přepnula vzhled.

## Třetí Háv (retro PC RPG)

Styl Eye of the Beholder 1–3, Legends of Kyrandia, Dungeon Master, Wizardry 7: pixelart, sytá „drahokamová“ paleta
(tlačítka), pseudo zlaté, stříbrné a měděné kování, mramorové pozadí, čitelné písmo (nejlépe s embosem).
Nemá napodobovat Truhlici.

- **M1 (jen tokeny):** paleta drahokamů a kovů, ostré hrany (`radius` 0), čitelné písmo, tmavý základ.
- **M2 (obrázky), hotovo:** mramorové pozadí (SVG se šumem, napojitelné dlaždice), měděné kování panelů a safírová
  tlačítka ve zlaté objímce jako devítidílné rámečky, ornamentální lišta záložek a dělicí čára, sedm ikon-drahokamů (ikona modulu `knihovna` je Sluj: vchod do jeskyně)
  a embos textu přes `--drd-text-shadow`. Grafika je vyrobená programově (`src/themes/podzemi/art.ts`) a je součástí kódu
  (precache PWA bere jen js, css a html, samostatné soubory by offline chyběly). Dá se nahradit lepší grafikou:
  stačí exportovat vzor, vyměnit soubory v `assets/` a nahrát pod jiným `id`.
- **Později:** pixelartové ikony a tlačítka malované ručně (tehdy má smysl `pixelated` u ikon: `iconStyle`).

## Milníky

**M1: základ.** Formát a validace, úložiště Hávů v IndexedDB, volba aktivního Hávu v nastavení (výchozí „podle systému"),
Šatník v Dílně (seznam, náhled na telefonu na výšku a na šířku a na tabletu, aktivace, smazání, export a import),
tři vlastní Hávy. Změny potřebné pro skinování se slučují do `develop` už po M1 (a rozdělení tokenů hned, protože zasahuje
do mnoha komponent a vedle se vyvíjejí výpravy).

**M2: textury a rámování.** Role prvků (`background`, `panel`, `button`, `tab`, `divider`, `dialog`) s obrázkem a režimem
(`stretch`, `contain`, `cover`, `repeat`, `repeat-x`, `repeat-y`, `slice`). Ikonová sada Hávu s rezervou na emoji.
Vše přes CSS bez změny struktury; jediná změna komponent je ikona záložek v `App.svelte`.

**Role `dialog`:** deset dialogů (potvrzení, výroba, Jizva, lektvar, kouzlo, nástraha, předpis, účastník, …) dřív opakovalo
stejné pozadí, okraj a zástěnu ve vlastních stylech, a zkratka `border` v nich rušila `border-image`. Společný vzhled je teď
jedno pravidlo `dialog` v `app.css`, komponenty mají jen vlastní šířku. Šířku okraje čte zvlášť `border-width`, protože zkratka
`border` přijímá jen jednu hodnotu a rámeček z Hávu má čtyři (s proměnnou ve zkratce by se okraj tiše vypnul).

**M3a: poloha lišty (0.5.7).** Token `--drd-nav-position` (`bottom`, `top`, `left`, `right`) se nastavuje stejně jako ostatní
tokeny, tedy i ve `variants` podle `when` (šířka, orientace, nízký viewport), takže jde určit pro všech 12 kombinací viewportu.
Svislý pruh (`left`, `right`) je 5 rem široký přes celou výšku okna, přišpendlená záložka „vlevo“ je nahoře a „vpravo“ dole, střed
se posouvá svisle. Roli `tab` může varianta nahradit (Podzemí: svislý lem `lem-bok` u pruhu vlevo). Uživatel polohu přebije
v Dílně → Spodní lišta (Poloha lišty: podle vzhledu, dole, nahoře, vlevo, vpravo); v náhledu Hávu v Šatníku se volba ignoruje.
Podzemí: svislý pruh vlevo na telefonu na šířku (nízký viewport) a v širokém okně, jinak dole. Role `tab` Hávu je laděná pro
polohy, které Háv sám určuje; při vlastní volbě uživatele zůstane lem Hávu, jaký je.

**M3b: tvary (0.5.8).** Tokeny `--drd-shape-panel|button|dialog` (`rect`, `chamfer`, `notch`) a `--drd-shape-size`. Aplikace z nich
vyrobí `clip-path` (`shape.ts`), manifest tedy nepřináší žádný volný text. Ořez odřízne i stín a roh rámečku z obrázku (u Podzemí
je to záměr, měděný rám je na seříznutém rohu přerušený). Ohnisko tlačítka se při ořezu přesune dovnitř (`--drd-focus-offset`),
aby zůstalo vidět při ovládání klávesnicí. Podzemí: tlačítka a okna `chamfer`, panely `notch`, 6 px.

**M3c: záhlaví a ozdoby (0.5.9).** Role `header` (viz tabulka rolí) je pás s obrázkem a názvem aplikace nad obsahem, výchozí je
bez záhlaví. Nadpisem stránky zůstává `h1` v obsahu, záhlaví je jen ozdoba. Uživatel ho může skrýt (Dílna → Spodní lišta →
Záhlaví vzhledu), v náhledu Hávu v Šatníku se volba ignoruje. Pole `ornaments` (nejvýše 8) je seznam
`{ "image", "anchor", "width" }`: kotva `top-left`, `top-right`, `bottom-left`, `bottom-right`, šířka 16 až 192 px. Obrázek je
nakreslený pro levý horní roh, ostatní kotvy ho aplikace zrcadlí. Ozdoby se kreslí za obsahem (nereagují na klepnutí, čtečky je
přeskočí) a **jen když se vejdou do volného bočního okraje** vedle sloupce obsahu; měří to aplikace (`placeOrnaments`), takže
na telefonu na výšku se neukážou a nikdy nepřekryjí text. Podzemí: záhlaví s měděným pásem na úzkém a středním viewportu (ne na
nízkém) a čtyři rohové ozdoby.

**M3: layout.** M3 je tím dokončený (M3a až M3c). Původní záměr: šablony rozložení (spodní, boční, horní lišta), kotvy a zóny, `clip-path` a maska pro dekorativní tvar uvnitř obdélníku.

**Později:** editor Hávů v aplikaci; rozhodnutí o samostatné aplikaci.

## Stav

- ✅ Rozdělení rolí tokenů a vyčištění pevných barev (PR #13).
- ✅ Formát a validace Hávu: `src/core/skin/` (`color.ts`, `tokens.ts`, `skin.ts`, testy). Světlý výchozí akcent ztmavnut
  na `#8a5e0e`, protože měl na pozadí jen 4,2:1.
- ✅ Čtení a zápis `.drdskin` (ZIP), úložiště v IndexedDB, volba Hávu v nastavení a použití za běhu podle viewportu
  (`zip.ts`, `file.ts`, `store.ts`, `active.ts`, `runtime.ts`; ověřeno i v prohlížeči).
- ✅ Modul Šatník (`src/modules/wardrobe/`, `#/satnik`, odkaz v Dílně): seznam vzhledů, použití, smazání, export a import
  `.drdskin` (i několika souborů, s výpisem chyb a varování) a náhled na zařízeních (telefon na výšku a šířku, tablet
  na výšku a šířku). Náhled je aplikace v `<iframe>` ve skutečných rozměrech zařízení; Háv se do něj předává přes `?hav=…`,
  takže se dá prohlížet bez aktivace. E2E: `e2e/satnik.spec.ts`.
- ✅ Tři vestavěné Hávy (`src/themes/havy.ts`): **Pergamen** (světlý, teplý papír a inkoust), **Noc** (tmavý, půlnoční modř)
  a **Podzemí** (retro PC RPG: ametystové plochy, zlatý akcent, měděné okraje, nulové zaoblení, tvrdý stín bez rozostření,
  Verdana). Jsou to obyčejné manifesty `.drdskin`, při načtení se zvalidují jako Háv ze souboru a musí projít bez chyb i
  varování; text na plochách má kontrast aspoň 7:1. Id jsou vyhrazená (`RESERVED_IDS`), Háv ze souboru je nezastíní. Nejdou
  smazat, ale jde z nich uložit vzor (Exportovat jako vzor); import takového souboru vyžaduje jiné `id`.
- ✅ **M1 je hotový.**
- ✅ **M2 (obrázky, role, ikony, stín textu):** `image.ts` (kontrola obrázků), `roles.ts` (role a převod na CSS proměnné),
  `file.ts`/`store.ts` (obrázky v archivu a úložišti), `runtime.ts` (adresy `blob:` jen pro používaný Háv, rušení při
  přepnutí), `appearance.svelte.ts` (ikony), `applyTheme` odebírá staré proměnné, `app.css`, `App.svelte`. Podzemí má grafiku.
  E2E: `e2e/satnik.spec.ts`.
- ✅ **Role `dialog`:** jednotný vzhled oken v `app.css`, role v Hávu, ozdobný zlatý rám s rubíny pro Podzemí.
- ✅ **M3 (poloha lišty, tvary, záhlaví a ozdoby)** je hotový, viz výše.
- ✅ **Švadlena (editor Hávů).** Dílna → Švadlena, adresa `#/satnik/svadlena[/<id>]`. Jádro `core/skin/editor.ts` (čisté
  funkce, test `editor.test.ts`), rozhraní `modules/wardrobe/Svadlena.svelte`. Upravuje se vždy vlastní kopie (`copyForEditing`
  z vestavěného, nainstalovaného nebo prázdného základu; `id` ve tvaru `moje-<název>`), která se ukládá do úložiště Hávů.
  Každá změna projde stejnou validací jako import (`setToken` → `tokenValueError`, před uložením `validateSkin` včetně
  kontrastu); neplatný stav se neuloží, náhled ukazuje poslední platný a editor vypíše důvody. Po 0,5 s se platný Háv uloží,
  přepočítá se, je-li používaný, a náhled (iframe jako v Šatníku, `rev` v adrese) se načte znovu.
  - ✅ **Etapa 1: tokeny** (barvy, písmo a stíny, zaoblení, mezery, tvary, průhlednost panelů, poloha lišty, metadata,
    schéma, export `.drdskin`, použití). Obrázky, role, ikony, ozdoby a varianty zůstávají ze zdroje beze změny.
  - ✅ **Etapa 2: obrázky** (`core/skin/editor-assets.ts`, `modules/wardrobe/SvadlenaImages.svelte`). Nahrání PNG, WebP, JPEG a SVG
    z počítače prochází stejnou kontrolou jako obrázek v souboru (`inspectImage`: typ podle obsahu, rozměry, SVG bez skriptů
    a cizích odkazů) a stejnými mezemi (32 obrázků, 2 MB, 16 Mpx dohromady). Role (pozadí, panel, tlačítko, lišta, dělicí čára,
    okno, záhlaví), ikony záložek a ozdoby se nastavují a ověřují týmiž funkcemi jako při importu (`validateRoles`,
    `validateOrnaments`); odebrání obrázku odebere i místa, která ho používají. Role ve variantách se zatím neupravují.
  - ✅ **Etapa 3: varianty** (`core/skin/editor-variants.ts`, `modules/wardrobe/SvadlenaVariants.svelte`). Přidání (z předvoleb),
    podmínka (šířka, orientace, nízké okno; musí omezit aspoň jednu), pořadí (pozdější přepíše dřívější), odebrání, přepsání tokenů
    a rolí (jako základní, vypnout, jiný obrázek) ověřené týmiž funkcemi jako při importu, souhrn pokrytí 12 kombinací okna.
    Náhled má i široké okno na šířku a na výšku. Ovládání tokenu (`TokenControl`) a role (`RoleControls`) je sdílené se základním editorem.
  - Švadlena je tím hotová; další nápady: úpravy ikon přímo v aplikaci (kreslení), sdílení Hávu odkazem.
