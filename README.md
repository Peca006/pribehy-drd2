# Příběhy v Dračím doupěti

Offline-first webová aplikace (PWA) pro vypravěče i hráče Dračího doupěte 2: tvorba a deník postav se
záznamem změn, bestiář a pravidla po ruce. Bez serveru, data zůstávají ve vašem zařízení. Mobile-first, česky.

Stav: **rané stadium vývoje**. V plánu jsou ještě družiny, sdílený žurnál dobrodružství a sdílení deníků
kódem nebo QR.

## Zásady

- **Obsah je v samostatných _obsahových balíčcích_,** ne v kódu aplikace. Pravidla a Bestiář v rozsahu SRD jsou
  ve složce `content-packs/srd/` (se svolením Altaru, viz Právní upozornění) a aplikace je stahuje ze svého webu;
  aktualizují se nezávisle na verzi aplikace. Další balíčky lze načíst ze souboru. Postava ukládá jen odkazy na
  obsah a vlastní hodnoty hráče.
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

Zdrojem balíčků je veřejně dostupné SRD Dračího doupěte II na [drd2srd.d20.cz](https://drd2srd.d20.cz/).
Nakladatelství Altar písemně potvrdilo, že text dostupný jako SRD smí být do **nekomerční** aplikace
zapracován (viz [content-packs/srd/SVOLENI.md](content-packs/srd/SVOLENI.md)). Proto jsou v repozitáři ve složce
`content-packs/srd/` a v nasazené aplikaci balíčky **jen v rozsahu SRD** (Základní příručka a Bestiář), které
si aplikace stahuje ze svého webu. Aplikace musí zůstat nekomerční. Jakékoli další texty (Hry mocných, Hotfix,
tištěné knihy) repozitář ani nasazení neobsahují a svolení se jich netýká; lze je načíst jen jako soukromé
balíčky. Vestavěný přehled (`src/data/skeleton.json`) obsahuje jen názvy, identifikátory a číselné
parametry, nikoli popisy ani texty pravidel.

Software je poskytován „tak, jak je“, bez jakékoli záruky, včetně záruky správnosti či úplnosti pravidel
(viz GPL-3.0-or-later). Při rozporu s tištěnými knihami platí vždy knihy.

## Struktura aplikace

Každá funkce je samostatný **modul** (`src/modules/<id>/`), který se zaregistruje do registru
(`src/core/modules.ts`) a je dostupný přes adresu `#/<id>/…`. Pořadí v navigaci a viditelnost určuje
modul sám, seznam modulů je v `src/modules/index.ts`. Moduly se nevolají napřímo, ale přes směrovač
(`go('postavy', id)`), takže je lze snadno přeskládat nebo otevřít z jiného místa.

- `src/core/` – logika bez uživatelského rozhraní: obsahové balíčky (`content/`), model postavy a deník změn
  (`character/`), družina a tracker konfliktu (`party/`), bytosti (`creatures/`), přenos zvukem (`audiogram/`),
  ukázková data (`demo.ts`), směrovač, odkazy mezi pojmy a kapitolami a potvrzovací dialog.
- `src/modules/` – funkce: `characters` (deníky postav, hody, sdílení), `creator` (průvodce tvorbou postavy,
  kroky v `steps/` se řadí v `steps.ts`), `reader` (příručka), `parties` (družiny, zápisy ze sezení, tracker
  konfliktu), `bestiar` (bestiář pro vypravěče: bytosti z balíčku jen ke čtení a vlastní bytosti s editorem,
  importem/exportem JSON a vlastními obrázky uloženými jen v zařízení; vychází ze SRD, viz Právní upozornění),
  `library` (Více: nastavení, balíčky, ukázková data, zkouška zvuku, informace o aplikaci).
- `src/ui/` – sdílené komponenty (mini-markdown, bloky kapitol, potvrzovací dialog, QR) a `src/ui/audiogram/`
  (odesílání, příjem a zkouška zvuku).
- Data ukázkových postav jsou v `src/data/demo.ts`.
- Odkazy `chapter:ID#kotva` a `term:ID` v textech se otevírají z kteréhokoli modulu.
- **Rejstřík** (Příručka → Rejstřík) se skládá z herních pojmů balíčku. Další místa u pojmů s vysvětlením na více
  místech a vlastní hesla se doplňují ručně v `src/data/index-extra.json` (jen ID pojmů a cíle `chapter:ID#kotva`,
  žádné texty knih): `{ "terms": { "pojem:zdroje": ["chapter:35-pouzivani-dovednosti#suroviny"] },
  "entries": [{ "name": "Heslo", "targets": ["chapter:ID#kotva", "chapter:ID2"] }] }`. První cíl hesla je hlavní odkaz,
  ostatní jsou v závorce. Neznámé kapitoly se vynechají.
