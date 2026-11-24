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
- Hodnota podle typu: barva, délka, seznam písem (jen systémová písma), stín. Ověření přes `CSS.supports` a vlastní kontrola
  (žádné `url()`, `;`, `{`, `}`, `\`, `/*`). V M1 žádné vlastní fonty ani obrázky.
- Limity: velikost souboru, počet variant, délka hodnot.
- Kontrast (WCAG): `text`/`bg`, `text`/`surface`, `text-muted`/`bg`, `accent`/`surface`, stavové barvy/`surface`.
  Pod 3:1 se Háv nedá aktivovat, pod 4,5:1 se jen varuje. Kontrola se provádí i na každé variantě.

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

- ✅ Rozdělení rolí tokenů a vyčištění pevných barev (`a3cfcd0`).
- 🚧 Formát, validace, úložiště, modul Šatník.
