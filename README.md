# Příběhy v Dračím doupěti

Offline-first webová aplikace (PWA) pro vypravěče i hráče Dračího doupěte 2: tvorba a deník postav se
záznamem změn, bestiář a pravidla po ruce. Bez serveru, data zůstávají ve vašem zařízení. Mobile-first, česky.

Stav: **rané stadium vývoje**. V plánu jsou ještě družiny, sdílený žurnál dobrodružství a sdílení deníků
kódem nebo QR.

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

## Právní upozornění

Tento projekt je **neoficiální fanouškovský nástroj**. Není vytvořen, schválen ani podporován nakladatelstvím
Altar ani jinými nositeli práv k hře Dračí doupě 2.

Názvy a značky **Altar**, **Dračí doupě**, **DrD 2** (DrD2) a související názvy, loga a označení jsou
ochrannými známkami či jiným majetkem svých vlastníků a používají se zde pouze k označení hry, se kterou je
aplikace určena k použití. Texty pravidel, bestiáře a další obsah her jsou autorskými díly svých autorů a
vydavatelů a řídí se jejich vlastními podmínkami; do aplikace se načítají jen jako samostatné obsahové balíčky
a jejich použití je na odpovědnosti uživatele.

Zdrojem převodníku je veřejně dostupné SRD Dračího doupěte II na [drd2srd.d20.cz](https://drd2srd.d20.cz/),
které vzniklo podle jeho autorů s výslovným svolením nakladatelství Altar a autorů hry. Web SRD nestanoví
podmínky pro další šíření textu ani pro odvozená díla, a proto **repozitář ani nasazená aplikace žádný text
SRD neobsahují**. Případné balíčky se šíří jen soukromě v uzavřeném okruhu testerů, dokud nebudou podmínky
upřesněny s nositeli práv.

Software je poskytován „tak, jak je“, bez jakékoli záruky, včetně záruky správnosti či úplnosti pravidel
(viz GPL-3.0-or-later). Při rozporu s tištěnými knihami platí vždy knihy.

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
  import/export JSON). Vlastní bytosti jsou v oddělené části úložiště. Bestiář vychází ze SRD (viz Právní upozornění). Ke každé bytosti si lze přidat vlastní obrázky (ukládají se jen v zařízení).
- `src/ui/` – sdílené komponenty (zobrazení textů v mini-markdownu, bloky kapitol).
- Odkazy `chapter:ID#kotva` a `term:ID` v textech se otevírají z kteréhokoli modulu.
