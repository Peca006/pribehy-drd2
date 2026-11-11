# Družina – Dračí doupě 2

Offline-first webová aplikace (PWA) pro vypravěče i hráče Dračího doupěte 2: deníky postav, více družin,
sdílený žurnál dobrodružství a synchronizace bez serveru. Mobile-first, česky.

Stav: **rané stadium vývoje** (krok 1 – kostra projektu).

## Zásady

- **Aplikace neobsahuje texty pravidel.** Obsah (povolání, schopnosti, výbava, bestiář) se načítá ze samostatných
  _obsahových balíčků_. Postava ukládá jen odkazy na obsah a vlastní hodnoty hráče.
- **Edice a opravy jako vrstvy (overlay):** Pravidla 2. vyd. + Bestiář 2. vyd. + Hry mocných 1. vyd.,
  volitelně Hotfix mistrovských povolání a/nebo opravy z Truhlice (Nogrim). Volí se na úrovni družiny.
- **Skiny:** vzhled je oddělen od logiky přes design tokeny (`--drd-*`, viz `src/core/theme.ts`).
- **Data jako seznam událostí** – historie změn, porovnání při synchronizaci, schvalování vypravěčem.
- Bez serveru: sdílení kódem / QR / souborem.

## Vývoj

```bash
npm install
npm run dev      # vývojový server
npm run check    # typy (svelte-check + tsc)
npm test         # testy (vitest)
npm run build    # produkční build + service worker
```

Větev `develop` je pracovní; vydání se značkují do hlavní větve.

## Zdrojové materiály

Knihy DrD2 a Truhlice jsou autorská díla třetích stran a **nejsou součástí repozitáře**. Lokálně patří do
`reference/` (ignorováno gitem). Texty z nich se do repozitáře nikdy necommitují.

## Licence

Kód: GPL-3.0-or-later, viz [LICENSE](LICENSE). Licence kódu se netýká obsahových balíčků ani textů pravidel.

## Struktura aplikace

Každá funkce je samostatný **modul** (`src/modules/<id>/`), který se zaregistruje do registru
(`src/core/modules.ts`) a je dostupný přes adresu `#/<id>/…`. Pořadí v navigaci a viditelnost určuje
modul sám, seznam modulů je v `src/modules/index.ts`. Moduly se nevolají napřímo, ale přes směrovač
(`go('postavy', id)`), takže je lze snadno přeskládat nebo otevřít z jiného místa.

- `src/core/` – logika bez uživatelského rozhraní: obsahové balíčky, model postavy (deník změn),
  směrovač, odkazy mezi pojmy a kapitolami.
- `src/modules/` – funkce: `characters` (deníky postav), `creator` (průvodce tvorbou postavy,
  kroky v `steps/` se řadí v `steps.ts`), `reader` (příručka), `library` (balíčky).
- `bestiar` – bestiář pro vypravěče: bytosti z balíčku (jen ke čtení) a vlastní bytosti (editor,
  import/export JSON). Vlastní bytosti jsou v oddělené části úložiště; knižní bytosti se nesdílejí.
- `src/ui/` – sdílené komponenty (zobrazení textů v mini-markdownu, bloky kapitol).
- Odkazy `chapter:ID#kotva` a `term:ID` v textech se otevírají z kteréhokoli modulu.
