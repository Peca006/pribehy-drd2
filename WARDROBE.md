# Šatník (modul `wardrobe`) a formát Hávu

Šatník převléká aplikaci. Jeden vzhled se jmenuje **Háv** (soubor `.drdskin`). Šatník je modul v sekci Více;
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
| `--drd-radius`, `--drd-gap`, `--drd-font` | tvar, mezery, písmo |

Komponenty nesmí mít pevné barvy ani rozměry mimo tokeny. Výjimky: QR kód (musí být černobílý) a pozadí prohlížeče obrázků.

## Soubor `.drdskin` (ZIP)

```
manifest.json        povinný
assets/…             volitelné obrázky (od M2)
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
  "variants": [                      // od začátku ve formátu, v M1 jen přepisy tokenů
    { "when": { "width": "compact", "orientation": "landscape" }, "tokens": { "--drd-gap": "0.5rem" } }
  ],
  "assets": {}                       // od M2
}
```

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
  - V M1 žádné vlastní fonty ani obrázky (`assets` se ignoruje s varováním).
- Limity: manifest nejvýše 64 KB, nejvýše 16 variant; `id` nesmí být `system`, `default-dark`, `default-light`.
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
  přepíše. Zahrnutí Hávů do celkového zálohování se rozhodne zvlášť.
- **Volba** (`settings.skin`): `system` (výchozí), `default-light`, `default-dark`, nebo `id` nainstalovaného Hávu.
  Smazaný či neplatný Háv spadne na „podle systému“, aplikace zůstane vždy použitelná.
- **Viewport za běhu** (`runtime.ts`): přepočítává se při `resize` a `orientationchange` (s kontrolou po 250 ms, protože
  některé prohlížeče pošlou událost dřív, než se přepočítají rozměry). Při psaní do pole se orientace a „nízký“ viewport
  nemění, jinak by vysunutá klávesnice na telefonu přepnula vzhled.

## Třetí Háv (retro PC RPG)

Styl Eye of the Beholder 1–3, Legends of Kyrandia, Dungeon Master, Wizardry 7: pixelart, sytá „drahokamová“ paleta
(tlačítka), pseudo zlaté, stříbrné a měděné kování, mramorové pozadí, čitelné písmo (nejlépe s embosem).
Nemá napodobovat Truhlici.

- **M1 (jen tokeny):** paleta drahokamů a kovů, ostré hrany (`radius` 0), čitelné písmo, tmavý základ.
- **M2 (textury):** mramorové pozadí (dlaždice), kování jako 9-slice rámečky, pixelartové ikony a tlačítka-drahokamy;
  pro embos přidat token pro stín textu (`--drd-text-shadow`), který zatím chybí.

## Milníky

**M1: základ.** Formát a validace, úložiště Hávů v IndexedDB, volba aktivního Hávu v nastavení (výchozí „podle systému"),
Šatník v sekci Více (seznam, náhled na telefonu na výšku a na šířku a na tabletu, aktivace, smazání, export a import),
tři vlastní Hávy. Změny potřebné pro skinování se slučují do `develop` už po M1 (a rozdělení tokenů hned, protože zasahuje
do mnoha komponent a vedle se vyvíjejí výpravy).

**M2: textury a rámování.** Role prvků (`background`, `panel`, `button`, `tab`, `divider`, `frame`) s obrázkem a režimem
(`stretch`, `contain`, `repeat`, `repeat-x`, `repeat-y`, `slice`). Ikonová sada Hávu s rezervou na emoji. Vše přes CSS bez změny struktury.

**M3: layout.** Šablony rozložení (spodní, boční, horní lišta), kotvy a zóny, `clip-path` a maska pro dekorativní tvar uvnitř obdélníku.

**Později:** editor Hávů v aplikaci; rozhodnutí o samostatné aplikaci.

## Stav

- ✅ Rozdělení rolí tokenů a vyčištění pevných barev (PR #13).
- ✅ Formát a validace Hávu: `src/core/skin/` (`color.ts`, `tokens.ts`, `skin.ts`, testy). Světlý výchozí akcent ztmavnut
  na `#8a5e0e`, protože měl na pozadí jen 4,2:1.
- ✅ Čtení a zápis `.drdskin` (ZIP), úložiště v IndexedDB, volba Hávu v nastavení a použití za běhu podle viewportu
  (`zip.ts`, `file.ts`, `store.ts`, `active.ts`, `runtime.ts`; ověřeno i v prohlížeči).
- 🚧 Modul Šatník v sekci Více (seznam, náhled, aktivace, smazání, import a export souboru), tři Hávy
  (Pergamen, Noc, retro RPG).
