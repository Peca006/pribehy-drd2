# Kartotéky DrD2 – plán, poznámky, TODO

Cíl: ze SRD (Příručka, Bestiář) a později z lokálních Her mocných vyrobit ploché JSON karty schopností (ZS) a dovedností
s atributy a markdown textem. Předlohou jsou Kartotéky Kostky (https://rpgforum.cz/forum/viewtopic.php?t=17184).
Větev `kartoteky`, skripty v `tools/kartoteky/`.

Lokální podklady (adresář `reference/` je v gitu ignorovaný, je jen v hlavní složce `C:\gitRepos\pribehy-drd2`):
Fafrinova sada `reference/kartoteky/drd2-zs.md`, přehled dials `reference/kartoteky/_Přehledy dials.xlsx`,
Hry mocných `reference/work/hry-structured.json`. Výstupy skriptů jdou do `reference/work/` (také lokálně).

## Postup
1. [x] Inventář (`inventar.mjs` → `reference/work/kartoteky-inventar.json`).
2. [x] Vlastní taxonomie zdola (`taxonomie.mjs`, `TAXONOMIE.md`; návrh k schválení, bod 3).
3. [ ] Porovnání s Fafrinovými dials, schvaluje uživatel (kontrolní bod před hromadným štítkováním).
4. [ ] Slovník: stabilní anglické `id`, český popisek, alias na původní hodnotu z Kostky, export `drd2-zs` / `drd2-skill`.
5. [ ] Kalibrace: naslepo ohodnotit Fafrinových 86 karet novou taxonomií a porovnat.
6. [ ] Hry mocných: jen lokálně, až po příručkách; výstup pro Kostku HM nikdy nesmí obsahovat (Hotfix = primární zdroj).

## Inventář – zjištění (22. 11. 2026)
- Příručka: 206 ZS (60 základní povolání, 120 pokročilá, 25 rasové, 1 společná), 77 dovedností. Názvy unikátní.
- Fafrinových 86 ZS = 60 základních povolání + 25 rasových + 1 společná. Pokročilá povolání (120) a dovednosti nepokrývá.
- Dovednosti jsou v datech jen název + atribut + `items` (seznam toho, co umožňují), bez souvislého textu. Otevřené: co je „text“ karty.
- Bestiář: 117 tvorů (dalších 43 je v balíčku pravidel, bez překryvu id).
- Bestiář nemá vlastní karty. Definice jsou h4 nadpisy v kapitole „Jak bytosti číst“ (v pravidlech kopie v kapitole 43).
  Z 56 nadpisů je 27 schopností odkazovaných tvory, zbytek druhy bytostí, prostředí a oddíly popisu.
- Odkazy tvorů ze statistik: 85 unikátních cílů = 57 do Příručky (povolání, rasy), 27 do Bestiáře, 1 do kapitoly 43.
  Tvor schopnost „umí“, nová karta vzniká jen u 27 bestiářových.

## Bestiářových 27 (kandidáti na karty)
Játra z křemene, Ocelová vůle, Srdce gryfa, Nos na lumpárny, Ve zbroji jako v kůži, Oživlá hora, Třetí oko, Autorita,
Hrůza a děs, Diplomat, Bulíky na nos, Rozsévač, Triumfální příchod, Boj či ovlivňování ve skupině, Vůdce skupiny,
Člen skupiny, Živá vlna, Nelidská rychlost, Ztělesněná zkáza, Masakr, Nezastavitelný, Prastarý, Dav, Nesmrtelný,
Nezranitelnost, Zranitelnost, Neschopnost.

## Textové statistiky tvorů (bestiář, 117 tvorů)
Nejsou to odkazy, ale hodnoty zapsané přímo; zatím zmapováno, nezpracováno do karet:
- **Talenty** (59 tvorů, ~43 názvů, např. Číhající tvor, Pan domácí, Malá šelma): kurzíva + závorka s úrovní (*bravurní*,
  *nadání*) a situací. Kandidát na samostatný druh karty (talent bytosti).
- **Přirozené nástrahy a jedy** (24 záznamů, 23 názvů, např. Výkřik zoufalství, Zmijí jed): strukturovaný zápis
  (kdo / typ nástrahy > atribut, účinek / znamení). Kandidát na karty nástrah.
- **Přirozené nástroje** (22 záznamů, 26 názvů, např. exotický přízvuk (*slova*)): typ nástroje v závorce.
- **Neobvyklé smysly** (31 záznamů): většinou odkaz na rasovou ZS Noční oči nebo volný text (vynikající čich, sluch).
- **Přirozené ochrany** (18): odkazují na Játra z křemene, Ocelovou vůli, Srdce gryfa, Nos na lumpárny (už mezi 27).
- Přirozené a oblíbené zbraně: nezkoumáno, patří spíš k výbavě než ke schopnostem.

## Nezranitelnost / Zranitelnost / Neschopnost
- Definice jsou jen v Bestiáři (kapitola 12; v pravidlech kapitola 43). V textu balíčku pravidel se mimo bestiář
  nevyskytují: souvislost s magií ani elixíry nenalezena (jen „nejzranitelnější místo“ u přilby a dračí krev
  zajišťující nezranitelnost). Ověřeno jen v balíčcích, ne v PDF/HTML referenci; případně dohledat v kapitole kouzel.
- Je to vlastnost bytosti s podmínkou, ne dovednost postavy. Rozhodnout: karta typu `zs`, nebo zvláštní typ (např. `being-trait`).

## Chyby ve zdroji
- V balíčku pravidel odkazuje „Hrůza a děs“ u jednoho tvora na `#neschopnost` (chapter:43-bestiar). Ověřit proti SRD.

## Rozhodnutí (22. 11. 2026)
- Text karty dovednosti = odrážky z `items` jako markdown, beze změny zdroje (heslovitý popis pro představu hráče).
- Rozsah karet zatím: 206 ZS Příručky, 77 dovedností, 27 bestiářových schopností. Talenty, nástrahy, jedy a ostatní textové statistiky tvorů zatím bez karet.
- Nezranitelnost, Zranitelnost, Neschopnost: typ `zs` s příznakem `monster` (jako u Kostky).

## Otevřené otázky
- Fafrinovy hodnoty jako referenci, nebo jeden z názorů? (rozhodne uživatel po porovnání)
- Má smysl diff proti 1. vydání příruček? Nejdřív zjistit obsah `reference/rozdily-*.md`.

## Bod 4 – slovník a export (22. 11. 2026)
- `slovnik.mjs`: id, český popisek a alias na hodnotu Kostky (mechanism, domain, subject, target-kind, zdroje, rasy).
- `export.mjs`: plochá JSON karta (`reference/work/kartoteky-karty.json`) a export ve formátu Kostky (`drd2-zs.md`, `drd2-skill.md`);
  206 ZS Příručky + 27 bestiářových (návrh, `labels: auto-draft`) + 77 dovedností.
- `overeni.mjs`: kontrola exportu proti Fafrinovým 86 kartám. Shoda: attribute, level, class-basic, race, rulebook 86/86,
  activation-cost 86/86, related-skill 83/86 (3 rozdíly jsou chyby zápisu u Fafrina nebo jeho úsudek), purpose přesně 40/86.
- Zbývá: `domain` (u 72 ZS prázdné; Fafrin tam má hlavně Jednání, Jizvy, Skrývání, Magie), dovednosti nemají
  `environment`, `target`, `target-attribute`, `source-zs`; bestiářová pravidla `group-rule` / `against-being` čekají na schválení.
- Export je jen lokální (v `reference/work/`, ignorováno); do repa se nedávají.
