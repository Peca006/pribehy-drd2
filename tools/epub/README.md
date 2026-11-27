# ePub ze SRD (soukromá kniha do čtečky)

Z veřejných balíčků `content-packs/srd/` (Příručka + Bestiář) sestaví jednu knihu ePub 3 s vnitřními odkazy,
obsahem a rejstříky. Nástroj žádné texty neobsahuje; výsledná kniha patří mimo git.

```
npm run build:epub                          # -> content-packs/local/epub/drd2-srd.epub (gitignorováno)
node tools/epub/build.mjs --out cesta.epub  # jiný výstup
```

- `lib.mjs` – čisté funkce (`buildEpub`): XHTML kapitol, bytosti, obsah (`nav` i `toc.ncx`), rejstříky, `content.opf`.
- `build.mjs` – načtení balíčků, převod obrázků (`sharp`: šedotón, JPEG, šířka do 1000 px) a zápis ZIPu
  (`src/core/skin/zip.ts`, tentýž zapisovač jako u `.drdskin`; `mimetype` je první a uložený bez komprese).
- `epub.test.ts` – well-formed XHTML, všechny odkazy a kotvy existují, manifest a spine souhlasí, rejstříky nejsou prázdné.

## Rejstříky

Pojmový rejstřík vzniká z míst, kde SRD píše pojem tučnou kurzívou (`***pojem***`), a ze seznamu `terms` v balíčku
(vysvětlení pojmu je hlavní odkaz). U častých pojmů je nejvýše 8 míst. Různé tvary téhož slova (sudba, sudbu, sudeb) se sloučí v `forms.mjs`:
kmen bez diacritiky a koncovky, spojení podle předpony kmene, základní tvar podle koncovky a četnosti; tam, kde to
nevychází, rozhoduje tabulka `LEMMA` (a `IRREGULAR` pro nepravidelné a ženské tvary povolání). Další rejstříky: bytosti, povolání a schopnosti,
rasy/kultury/rysy, výbava. Místa se hledají v textu podle ID nadpisů, čísla stran e-kniha nemá.

## Známé nedostatky zdroje

Dva odkazy v SRD (`chapter:36-kouzla-nastahy-leceni#…`) vedou na neexistující kapitolu (překlep v ID); v knize
jsou jen text a nástroj je vypíše jako upozornění.
