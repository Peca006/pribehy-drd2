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
